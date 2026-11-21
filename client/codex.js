/* 混乱与蠕动 · 地地图鉴渲染器
 * 兵种档案 / 技能卡库 / 配乐试听。
 * 联机版 /codex 页面与单机热座浮层共用：容器带 data-mode="page" 或 "overlay"。
 */
(function () {
  'use strict';

  const rootEl = document.getElementById('codexRoot');
  if (!rootEl) return;

  const DATA = window.ChaosCodexData || { UNIT_CATEGORIES: [], UNITS: [], MUSIC: [] };
  const isOverlay = rootEl.dataset.mode === 'overlay';
  const popup = isOverlay ? rootEl.closest('.codex-popup') : null;

  let rendered = false;
  let opened = false;
  let activeTab = 'units';
  let unitCat = 'all';
  let skillBand = 'all';
  let unitQuery = '';
  let skillQuery = '';
  let musicQuery = '';
  let previewingId = null;

  function esc(text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function escapeHTML(text) {
    if (window.ChaosUI && window.ChaosUI.escapeHTML) return window.ChaosUI.escapeHTML(text);
    return esc(text);
  }

  function unitFigure(fig, glyph) {
    if (window.ChaosUI && window.ChaosUI.unitFigureHTML && fig) {
      return window.ChaosUI.unitFigureHTML(fig);
    }
    return '<span class="unit-glyph" aria-hidden="true">' + esc(glyph || '?') + '</span>';
  }

  function modeIcon(id) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#' + esc(id || 'u-crest') + '"></use></svg>';
  }

  function getSkills() {
    if (window.ChaosConstants && Array.isArray(window.ChaosConstants.SKILL_LIBRARY)) {
      return window.ChaosConstants.SKILL_LIBRARY.slice();
    }
    if (window.SKILL_CARD_MAP) {
      return Object.keys(window.SKILL_CARD_MAP)
        .map((k) => window.SKILL_CARD_MAP[k])
        .filter((c) => c && c.id != null)
        .sort((a, b) => a.id - b.id);
    }
    return [];
  }

  function getNotes() {
    return (window.ChaosConstants && window.ChaosConstants.CARD_NOTES) || window.CARD_NOTES || {};
  }

  function getKeywordHelp() {
    return (window.ChaosConstants && window.ChaosConstants.CARD_KEYWORD_HELP) || window.CARD_KEYWORD_HELP || {};
  }

  function catLabel(id) {
    const c = DATA.UNIT_CATEGORIES.find((x) => x.id === id);
    return c ? c.label : '';
  }

  function unitMatches(u, query) {
    if (unitCat !== 'all' && u.cat !== unitCat) return false;
    if (!query) return true;
    const hay = [u.name, catLabel(u.cat), u.desc, u.story, (u.tags || []).join(' '), u.move, u.attack].join(' ');
    return hay.toLowerCase().includes(query.toLowerCase());
  }

  function skillMatches(c, query) {
    if (skillBand !== 'all') {
      const cost = Number(c.cost);
      if (skillBand === '0-1' && !(cost <= 1)) return false;
      else if (skillBand === '2' && cost !== 2) return false;
      else if (skillBand === '3' && cost !== 3) return false;
      else if (skillBand === '4' && cost !== 4) return false;
      else if (skillBand === '5' && !(cost >= 5)) return false;
    }
    if (!query) return true;
    const note = getNotes()[c.id] || '';
    return (String(c.name) + ' ' + String(c.desc) + ' ' + note).toLowerCase().includes(query.toLowerCase());
  }

  /* ── 页面骨架 ───────────────────────────────────────────── */

  function buildShell() {
    const skills = getSkills();
    const unitCount = DATA.UNITS.length;
    const musicCount = DATA.MUSIC.length;
    rootEl.innerHTML =
      '<div class="codex-shell">' +
        '<div class="codex-head">' +
          '<div>' +
            '<p class="codex-eyebrow">CODEX · 地地图鉴</p>' +
            '<h1 class="codex-title">地地图鉴</h1>' +
            '<p class="codex-sub">翻检兵种档案、技能卡原文与配乐试听。所有数据取自当前版本的游戏本体。</p>' +
          '</div>' +
          '<div class="codex-count">收录' +
            '<b>' + unitCount + ' · ' + skills.length + ' · ' + musicCount + '</b>' +
            '兵种 · 技能卡 · 曲目' +
            (isOverlay ? '' : '<a class="codex-nav-link" href="/" target="_self">← 返回大厅</a>') +
          '</div>' +
        '</div>' +
        '<div class="codex-tabs" role="tablist" aria-label="图鉴分类">' +
          '<button type="button" class="codex-tab" role="tab" data-tab="units" aria-selected="true">兵种档案<small>UNITS</small></button>' +
          '<button type="button" class="codex-tab" role="tab" data-tab="skills" aria-selected="false">技能卡库<small>SKILL CARDS</small></button>' +
          '<button type="button" class="codex-tab" role="tab" data-tab="music" aria-selected="false">配乐试听<small>SOUNDTRACK</small></button>' +
        '</div>' +
        '<div class="codex-body">' +
          '<section class="codex-panel-view" id="codexPanelUnits" role="tabpanel">' +
            '<div class="codex-toolbar">' +
              '<div class="codex-search"><input id="codexUnitSearch" type="search" placeholder="搜索兵种、能力或档案……" autocomplete="off" spellcheck="false" aria-label="搜索兵种"></div>' +
              '<div class="codex-chips" id="codexUnitChips"></div>' +
            '</div>' +
            '<p class="codex-result" id="codexUnitResult"></p>' +
            '<div class="codex-grid units" id="codexUnits"></div>' +
          '</section>' +
          '<section class="codex-panel-view" id="codexPanelSkills" role="tabpanel" hidden>' +
            '<div class="codex-toolbar">' +
              '<div class="codex-search"><input id="codexSkillSearch" type="search" placeholder="搜索技能名称或效果……" autocomplete="off" spellcheck="false" aria-label="搜索技能卡"></div>' +
              '<div class="codex-chips" id="codexSkillChips"></div>' +
            '</div>' +
            '<p class="codex-result" id="codexSkillResult"></p>' +
            '<details class="skill-keywords" id="codexKeywordBox" style="margin:0 0 14px;padding:10px 13px;border:1px solid var(--cx-line);background:rgba(0,0,0,.16);">' +
              '<summary style="cursor:pointer;font-family:var(--cx-mono);font-size:10px;letter-spacing:.18em;color:var(--cx-brass);">关键词释义 · GLOSSARY</summary>' +
              '<div class="codex-keyword-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:7px 16px;margin-top:10px;font-size:11px;line-height:1.7;color:#a99f8a;"></div>' +
            '</details>' +
            '<div class="codex-grid skills" id="codexSkills"></div>' +
          '</section>' +
          '<section class="codex-panel-view" id="codexPanelMusic" role="tabpanel" hidden>' +
            '<div class="codex-toolbar">' +
              '<div class="codex-search"><input id="codexMusicSearch" type="search" placeholder="搜索曲目……" autocomplete="off" spellcheck="false" aria-label="搜索曲目"></div>' +
              '<div class="codex-chips" id="codexMusicChips"></div>' +
            '</div>' +
            '<div id="codexMusicGroups"></div>' +
            '<p class="codex-result" style="margin-top:4px;">全部曲目由 Web Audio 实时合成，不含任何音频文件。试听时结束曲会循环播放，游戏中仍只播一次。</p>' +
            '<div class="codex-music-bar">' +
              '<div class="codex-music-now"><span>NOW PLAYING · 正在试听</span><b id="codexNowTitle">未播放</b></div>' +
              '<div class="codex-vol"><label for="codexVolume">音量</label><input id="codexVolume" type="range" min="0" max="1" step="0.01" value="1" aria-label="试听音量"></div>' +
              '<button type="button" class="codex-music-stop" id="codexStopBtn" disabled>■ 停止</button>' +
            '</div>' +
          '</section>' +
        '</div>' +
        '<div class="codex-foot"><span>混乱与蠕动 · 战地图鉴 · v2.1.0</span><span>' +
          (isOverlay ? '按 Esc 或点击空白处关闭' : '数据取自当前游戏版本') +
          '</span></div>' +
      '</div>';

    // 分类按钮
    const chips = rootEl.querySelector('#codexUnitChips');
    const cats = [{ id: 'all', label: '全部' }].concat(DATA.UNIT_CATEGORIES);
    chips.innerHTML = cats.map((c) =>
      '<button type="button" class="codex-chip" data-cat="' + esc(c.id) + '" aria-pressed="' + (c.id === 'all') + '">' + esc(c.label) + '</button>'
    ).join('');

    const skillChips = rootEl.querySelector('#codexSkillChips');
    skillChips.innerHTML = [
      ['all', '全部'], ['0-1', '0–1 费'], ['2', '2 费'], ['3', '3 费'], ['4', '4 费'], ['5', '5 费+']
    ].map(([id, label]) =>
      '<button type="button" class="codex-chip" data-band="' + id + '" aria-pressed="' + (id === 'all') + '">' + label + '</button>'
    ).join('');

    const musicChips = rootEl.querySelector('#codexMusicChips');
    musicChips.innerHTML = [['all', '全部'], ['loop', '场景循环'], ['end', '模式结束曲']].map(([id, label]) =>
      '<button type="button" class="codex-chip" data-mgroup="' + id + '" aria-pressed="' + (id === 'all') + '">' + label + '</button>'
    ).join('');

    // 关键词释义
    const kw = getKeywordHelp();
    const kwGrid = rootEl.querySelector('.codex-keyword-grid');
    if (kwGrid) {
      kwGrid.innerHTML = Object.keys(kw).map((k) =>
        '<div><b style="color:var(--cx-brass);font-weight:400;">' + esc(k) + '</b>：' + esc(kw[k]) + '</div>'
      ).join('');
    }

    wire();
    renderUnits();
    renderSkills();
    renderMusic();
  }

  /* ── 兵种 ───────────────────────────────────────────────── */

  function renderUnits() {
    const host = rootEl.querySelector('#codexUnits');
    if (!host) return;
    const list = DATA.UNITS.filter((u) => unitMatches(u, unitQuery));
    rootEl.querySelector('#codexUnitResult').textContent =
      'ARCHIVE ' + list.length + ' / ' + DATA.UNITS.length + ' · 按类别与关键词检索';
    if (!list.length) {
      host.innerHTML = '<div class="codex-empty">没有找到匹配的兵种。<br>试试更换关键词或选择「全部」。</div>';
      return;
    }
    host.innerHTML = list.map((u) => {
      const tags = (u.tags || []).map((t, i) =>
        '<span class="unit-tag' + (i === 0 ? ' hot' : '') + '">' + esc(t) + '</span>'
      ).join('');
      const badge = u.badge ? '<span class="unit-flag">' + esc(u.badge) + '</span>' : '';
      return '<article class="unit-card" data-cat="' + esc(u.cat) + '">' +
        '<div class="unit-top">' +
          '<div class="unit-figure">' + unitFigure(u.fig, u.glyph) + '</div>' +
          '<div class="unit-heading">' +
            '<h2 class="unit-name">' + esc(u.name) + badge + '</h2>' +
            '<div class="unit-tags">' + tags + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="unit-stats">' +
          '<div class="unit-stat"><span>COST · 费用</span><b>' + esc(u.cost) + ' <small style="color:var(--cx-faint)">' + esc(u.costNote || '') + '</small></b></div>' +
          '<div class="unit-stat"><span>MOVE · 移动</span><b>' + esc(u.move) + '</b></div>' +
          '<div class="unit-stat"><span>ATTACK · 攻击</span><b>' + esc(u.attack) + '</b></div>' +
        '</div>' +
        '<p class="unit-desc">' + esc(u.desc) + '</p>' +
        (u.story ? '<p class="unit-story">' + esc(u.story) + '</p>' : '') +
      '</article>';
    }).join('');
  }

  /* ── 技能卡 ─────────────────────────────────────────────── */

  function renderSkills() {
    const host = rootEl.querySelector('#codexSkills');
    if (!host) return;
    const all = getSkills();
    const notes = getNotes();
    const list = all.filter((c) => skillMatches(c, skillQuery));
    const result = rootEl.querySelector('#codexSkillResult');
    if (result) result.textContent = 'LIBRARY ' + list.length + ' / ' + all.length + ' · 费用与关键词检索';
    if (!list.length) {
      host.innerHTML = '<div class="codex-empty">没有找到匹配的技能卡。<br>试试更换关键词或选择「全部」。</div>';
      return;
    }
    host.innerHTML = list.map((c) => {
      const note = notes[c.id];
      return '<article class="skill-card">' +
        '<div class="skill-head">' +
          '<span class="skill-cost">⚡' + esc(c.cost) + '</span>' +
          '<h2 class="skill-name">' + esc(c.name) + '</h2>' +
          '<span class="skill-id">#' + esc(c.id) + '</span>' +
        '</div>' +
        '<p class="skill-desc">' + esc(c.desc) + '</p>' +
        (note ? '<p class="skill-note"><b>注</b> ' + esc(note) + '</p>' : '') +
      '</article>';
    }).join('');
  }

  /* ── 配乐 ───────────────────────────────────────────────── */

  function musicMatches(t) {
    if (!musicQuery) return true;
    return (t.title + ' ' + t.en + ' ' + t.meta + ' ' + t.desc).toLowerCase().includes(musicQuery.toLowerCase());
  }

  function renderMusic() {
    const host = rootEl.querySelector('#codexMusicGroups');
    if (!host) return;
    const list = DATA.MUSIC.filter(musicMatches);
    const groups = [
      { id: 'loop', title: '场景循环', note: 'LOOPS · 随场景自动切换' },
      { id: 'end', title: '模式结束曲', note: 'ENDINGS · 每局结束只播一次' }
    ];
    const parts = [];
    for (const g of groups) {
      const items = list.filter((t) => t.group === g.id);
      if (!items.length) continue;
      parts.push(
        '<div class="music-group" data-group="' + g.id + '">' +
          '<div class="music-group-head"><h3>' + g.title + '</h3><span>' + g.note + '</span></div>' +
          '<div class="codex-grid music">' + items.map((t) =>
            '<button type="button" class="music-card" data-track="' + esc(t.id) + '">' +
              '<span class="music-state">PLAYING</span>' +
              '<span class="music-icon">' + modeIcon(t.icon) + '</span>' +
              '<span class="music-main">' +
                '<span class="music-title" style="display:block;">' + esc(t.title) + '</span>' +
                '<span class="music-en" style="display:block;">' + esc(t.en) + '</span>' +
                '<span class="music-meta" style="display:block;">' + esc(t.meta) + '</span>' +
                '<span class="music-desc" style="display:block;">' + esc(t.desc) + '</span>' +
              '</span>' +
            '</button>'
          ).join('') + '</div>' +
        '</div>'
      );
    }
    host.innerHTML = parts.length ? parts.join('') : '<div class="codex-empty">没有找到匹配的曲目。</div>';
    syncMusicUI();
  }

  function findTrack(id) {
    return DATA.MUSIC.find((t) => t.id === id) || null;
  }

  function playTrack(id) {
    const M = window.ChaosMusic;
    if (!M) return;
    if (!previewingId) M.enterPreviewMode(isOverlay);
    const ok = M.preview(id, { loop: true });
    if (ok === false) return;
    previewingId = id;
    syncMusicUI();
  }

  function stopTrack() {
    const M = window.ChaosMusic;
    if (M) {
      if (isOverlay) M.exitPreviewMode();
      else M.stopPreview();
    }
    previewingId = null;
    syncMusicUI();
  }

  function syncMusicUI() {
    rootEl.querySelectorAll('.music-card').forEach((card) => {
      const on = card.dataset.track === previewingId;
      card.classList.toggle('playing', on);
      card.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const title = rootEl.querySelector('#codexNowTitle');
    const stop = rootEl.querySelector('#codexStopBtn');
    const tr = previewingId ? findTrack(previewingId) : null;
    if (title) title.textContent = tr ? tr.title + ' · ' + tr.en : '未播放';
    if (stop) stop.disabled = !tr;
  }

  /* ── 交互 ───────────────────────────────────────────────── */

  function switchTab(tab) {
    activeTab = tab;
    rootEl.querySelectorAll('.codex-tab').forEach((btn) => {
      btn.setAttribute('aria-selected', btn.dataset.tab === tab ? 'true' : 'false');
    });
    const panels = { units: 'codexPanelUnits', skills: 'codexPanelSkills', music: 'codexPanelMusic' };
    Object.keys(panels).forEach((key) => {
      const el = rootEl.querySelector('#' + panels[key]);
      if (el) el.hidden = key !== tab;
    });
  }

  function wire() {
    rootEl.querySelectorAll('.codex-tab').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    const unitSearch = rootEl.querySelector('#codexUnitSearch');
    unitSearch.addEventListener('input', () => { unitQuery = unitSearch.value.trim(); renderUnits(); });
    rootEl.querySelectorAll('#codexUnitChips .codex-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        unitCat = chip.dataset.cat;
        rootEl.querySelectorAll('#codexUnitChips .codex-chip').forEach((c) =>
          c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'));
        renderUnits();
      });
    });

    const skillSearch = rootEl.querySelector('#codexSkillSearch');
    skillSearch.addEventListener('input', () => { skillQuery = skillSearch.value.trim(); renderSkills(); });
    rootEl.querySelectorAll('#codexSkillChips .codex-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        skillBand = chip.dataset.band;
        rootEl.querySelectorAll('#codexSkillChips .codex-chip').forEach((c) =>
          c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'));
        renderSkills();
      });
    });

    const musicSearch = rootEl.querySelector('#codexMusicSearch');
    musicSearch.addEventListener('input', () => { musicQuery = musicSearch.value.trim(); renderMusic(); });
    rootEl.querySelectorAll('#codexMusicChips .codex-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const g = chip.dataset.mgroup;
        rootEl.querySelectorAll('#codexMusicChips .codex-chip').forEach((c) =>
          c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'));
        rootEl.querySelectorAll('#codexMusicGroups .music-group').forEach((sec) => {
          sec.hidden = g !== 'all' && sec.dataset.group !== g;
        });
      });
    });

    rootEl.querySelector('#codexMusicGroups').addEventListener('click', (e) => {
      const card = e.target.closest('.music-card');
      if (!card) return;
      const id = card.dataset.track;
      if (previewingId === id) { stopTrack(); return; }
      playTrack(id);
    });
    const stopBtn = rootEl.querySelector('#codexStopBtn');
    if (stopBtn) stopBtn.addEventListener('click', stopTrack);

    const vol = rootEl.querySelector('#codexVolume');
    if (vol) {
      vol.addEventListener('input', () => {
        if (window.ChaosMusic) window.ChaosMusic.setVolume(Number(vol.value));
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && opened && isOverlay) close();
    });
  }

  /* ── 打开 / 关闭 ────────────────────────────────────────── */

  function open() {
    if (!rendered) { buildShell(); rendered = true; }
    opened = true;
    if (popup) popup.classList.add('show');
    document.body.style.overflow = 'hidden';
    if (activeTab === 'music') syncMusicUI();
  }

  function close() {
    if (!opened) return;
    opened = false;
    if (popup) popup.classList.remove('show');
    document.body.style.overflow = '';
    previewingId = null;
    // 只有真正试听过才需要退出试听态；单纯翻阅图鉴不打断场景音乐。
    if (window.ChaosMusic && window.ChaosMusic.isPreviewing()) window.ChaosMusic.exitPreviewMode();
    syncMusicUI();
  }

  window.ChaosCodex = Object.freeze({
    open: open,
    close: close,
    isOpen: function () { return opened; },
    switchTab: switchTab
  });

  if (!isOverlay) {
    // 独立页面：进入试听模式但不自动播放，避免一打开就出声。
    if (window.ChaosMusic) window.ChaosMusic.enterPreviewMode(false);
    buildShell();
    rendered = true;
    opened = true;
    const hash = (location.hash || '').replace('#', '');
    if (['units', 'skills', 'music'].includes(hash)) switchTab(hash);
  }
})();
