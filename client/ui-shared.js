// 混乱与蠕动 · 联机版与单机热座共用的纯表现层工具。
// 只放与状态无关、两端行为一致的函数；棋盘/对局渲染仍由各自会话层负责。
(function (root) {
  'use strict';

  function escapeHTML(text) {
    return String(text).replace(/[&<>"]/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    }[c]));
  }

  function cardKeywordEntries(card, help) {
    const desc = (card && card.desc) || '';
    const table = help || {};
    return Object.keys(table)
      .sort((a, b) => b.length - a.length)
      .filter((key) => desc.includes(key))
      .map((key) => ({ key, text: table[key] }));
  }

  function unitFigureHTML(figureId) {
    const neon = String(figureId).indexOf('fig-neon-') === 0;
    return '<svg class="unit-fig' + (neon ? ' neon-fig' : '') + '" viewBox="0 0 40 40" aria-hidden="true"><use href="#' + figureId + '"/></svg>';
  }

  const UNIT_ICONS = Object.freeze({
    '步兵': '⚔️', '车': '🐎', '炮兵': '💣', '海炮': '💣', '地雷': '💥',
    '后勤兵': '🛠️', '防御工事': '🏗️', '鬼魂': '👻', '墓碑': '🪦', '二阶步兵': '⚔️'
  });

  const ARMORY_ICONS = Object.freeze({
    '排雷兵': '🛡️', '掷弹兵': '⚔️', '工兵': '🛠️', '双发炮兵': '💣',
    '装甲车': '🐎', '补给车': '🚚', '二阶战车': '🐎', '指挥车': '🎖️'
  });

  function unitDisplayName(unit) {
    if (!unit) return '';
    return unit.displayName || unit.bossName || unit.mineType || unit.armoryType || unit.type || '';
  }

  function unitGlyph(unit) {
    const name = unitDisplayName(unit);
    return ARMORY_ICONS[name] || ARMORY_ICONS[unit && unit.armoryType] || UNIT_ICONS[unit && unit.type] || '';
  }

  function cardType(card) {
    if (!card) return 'tactic';
    const desc = card.desc || '';
    if (desc.includes('混乱')) return 'chaos';
    if (/攻击|火力|轰炸|消灭|反击/.test(desc)) return 'attack';
    if (/恢复|治疗|医疗|后勤|部署|增援/.test(desc)) return 'support';
    return 'tactic';
  }

  function skillCardHTML(card, options) {
    const opts = options || {};
    const cost = opts.cost === undefined ? (card && card.cost) : opts.cost;
    const baseCost = opts.baseCost === undefined ? (card && card.cost) : opts.baseCost;
    const costLabel = '⚡' + cost + (baseCost !== undefined && cost !== baseCost ? '（原' + baseCost + '）' : '');
    const info = opts.info === false ? '' : '<button class="card-info-btn" type="button" title="查看卡牌详情">ℹ</button>';
    return info
      + '<h3>' + escapeHTML(card ? card.name : '') + '</h3>'
      + '<div class="cost">' + escapeHTML(costLabel) + '</div>'
      + '<div class="desc">' + escapeHTML(card ? card.desc : '') + '</div>';
  }

  function logClass(line) {
    const text = String(line || '');
    if (text.startsWith('🐉')) return 'log-dragon';
    if (text.startsWith('☁️')) return 'log-sky';
    if (text.startsWith('🌋')) return 'log-volcano';
    if (text.startsWith('🏅')) return 'log-score';
    if (text.startsWith('🛡️')) return 'log-reinforce';
    if (text.startsWith('=== ')) return 'log-turn';
    if (/^[💥💣🎯🎲❤️]/.test(text) || text.includes('攻击') || text.includes('点数')) return 'log-damage';
    if (/^[🎴✨📋▶️]/.test(text) || text.includes('使用【') || text.includes('技能')) return 'log-card';
    if (/^[🛒✅]/.test(text) || text.includes('部署')) return 'log-deploy';
    return '';
  }

  let toastTimer = null;

  function toast(message, options) {
    const opts = options || {};
    let el = typeof opts.element === 'string'
      ? document.querySelector(opts.element)
      : (opts.element || document.getElementById('toast'));
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.id = opts.id || 'toast';
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = String(message == null ? '' : message);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), opts.duration || 2200);
  }

  function cellHighlightClass(state) {
    if (!state) return '';
    if (state.attack) return 'attackable';
    if (state.heal) return 'healable';
    if (state.highlight) return 'highlight';
    if (state.move) return 'reachable';
    return '';
  }

  // 通用单位徽章：只依赖已裁剪的展示字段，不读取会话状态。
  function unitBadgeExtras(unit, options) {
    const opts = options || {};
    if (!unit) return opts.extra || '';
    const buffs = unit.permaBuffs || [];
    let html = '';
    if (opts.marked) html += '<span class="badge-marked" title="已被侦察兵标记">🎯</span>';
    if (unit.chaos > 0) html += '<div class="chaos-mark">' + (unit.chaos > 3 ? '🌀×' + unit.chaos : '🌀'.repeat(unit.chaos)) + '</div>';
    if (unit.type === '二阶步兵' || unit.armoryType === '二阶战车') html += '<span class="badge-hp">❤️' + (unit.hp || 2) + '/2</span>';
    else if (unit.layer === 'mine' && unit.hp > 1) html += '<span class="badge-hp">❤️' + unit.hp + '</span>';
    if (unit.dragon) {
      const top = unit.type === '二阶步兵' ? ' style="top:-20px;"' : '';
      html += '<span class="badge-dragon"' + top + '>🐉' + (unit.layer === 'sky' && unit.dragonPower ? unit.dragonPower : '') + '</span>';
    }
    if (buffs.includes('elite_artillery')) html += '<span class="badge-elite-artillery">✨</span>';
    if (buffs.includes('elite_infantry')) html += '<span class="badge-elite-infantry">✨</span>';
    if (buffs.includes('elite_chariot')) html += '<span class="badge-elite-chariot">✨</span>';
    if (buffs.includes('minesweeper')) html += '<span class="badge-minesweeper">🛡️</span>';
    if (buffs.includes('mine_detector')) html += '<span class="badge-mine-detector">🔎</span>';
    if (buffs.includes('command_car')) html += '<span class="badge-command-car">🎖️</span>';
    if (buffs.includes('supply_car')) html += '<span class="badge-supply-car">➕</span>';
    if (buffs.includes('engineer')) html += '<span class="badge-engineer">🏗️</span>';
    if (buffs.includes('mine_resist')) html += '<span class="badge-mine-resist">🛡️</span>';
    if (buffs.includes('armored')) html += '<span class="badge-armored">🛡️</span>';
    if (buffs.includes('battle_damaged')) html += '<span class="badge-battle-damaged">⚠️</span>';
    if (buffs.includes('lantern_bearer')) html += '<span class="badge-lantern"' + (unit.type === '二阶步兵' ? ' style="top:-20px;"' : '') + '>🔆</span>';
    if (buffs.includes('grenadier') && !unit.grenadierUsed) html += '<span class="badge-grenadier">💣</span>';
    if (buffs.includes('medical_center')) html += '<span class="badge-medical-center">🏥</span>';
    if (buffs.includes('coconut') && opts.coconutLoaded !== undefined) {
      html += '<span class="badge-actions" title="当前待发炮弹">' + opts.coconutLoaded + '</span>';
    } else if ((unit.type === '炮兵' || unit.type === '海炮') && unit.remainingActions > 0) {
      html += '<span class="badge-actions">' + unit.remainingActions + '</span>';
    }
    if (unit.suppressed) html += '<span class="badge-suppressed">⛔</span>';
    if (unit.boarded) html += '<span style="font-size:10px;color:#66ccff;">⛵</span>';
    if (opts.neonCarry > 0) html += '<span class="neon-carry-mark" title="携带数据包 ' + opts.neonCarry + '">📦' + opts.neonCarry + '</span>';
    if (opts.target) html += '<span class="level-target-mark">🎯</span>';
    return html + (opts.extra || '');
  }

  function unitBadgeHTML(model) {
    const m = model || {};
    const unit = m.unit || {};
    const classes = ['unit-badge'];
    if (m.className) classes.push(m.className);
    if (unit.chaos > 0) classes.push('has-chaos');
    if (unit.dragon) classes.push('has-dragon');
    let attrs = '';
    if (m.unitType) attrs += ' data-unit-type="' + escapeHTML(m.unitType) + '"';
    if (m.unitId !== undefined && m.unitId !== null) attrs += ' data-unit-id="' + escapeHTML(String(m.unitId)) + '"';
    if (m.title) attrs += ' title="' + escapeHTML(m.title) + '"';
    if (m.hidden) attrs += ' style="display:none;"';
    const glyph = m.glyph || unitGlyph(unit);
    const fallback = glyph ? '<span class="unit-glyph-fallback" hidden>' + escapeHTML(glyph) + '</span>' : '';
    const icon = m.iconHTML || fallback;
    const extras = m.extras === undefined ? unitBadgeExtras(unit, m.options) : m.extras;
    return '<div class="' + classes.join(' ') + '"' + attrs + '>'
      + '<span class="unit-token" aria-hidden="true"><span class="unit-icon">' + fallback + icon + '</span></span>'
      + '<span class="unit-name">' + escapeHTML(m.name || unitDisplayName(unit)) + '</span>'
      + extras + '</div>';
  }

  function weatherChipHTML(weather) {
    const w = weather || {};
    const forecast = w.forecast
      ? '<span class="wx-sep">/</span><span class="wx-next">下期 ' + escapeHTML(w.forecast.icon + ' ' + w.forecast.label + ' · 回' + w.forecast.dueTurn) + '</span>'
      : (w.mode === 'fog' && w.fog && w.fog.forcedRemaining
        ? '<span class="wx-sep">/</span><span class="wx-next">强制 ' + w.fog.forcedRemaining + ' 回合</span>' : '');
    return '<span class="wx-icon">' + escapeHTML(w.icon || '') + '</span><span class="wx-label">' + escapeHTML(w.label || '')
      + '</span><span class="wx-effect">' + escapeHTML(w.shortEffect || '') + '</span>' + forecast;
  }

  function weatherDetailRows(weather) {
    const w = weather || {};
    const row = (label, value) => '<div class="weather-row"><span class="weather-k">' + escapeHTML(label) + '</span><span class="weather-v">' + value + '</span></div>';
    let rows = row('规则', escapeHTML(w.effectText || ''));
    if (w.forecast) rows += row('下期天候', '<strong>' + escapeHTML(w.forecast.icon + ' ' + w.forecast.label) + '</strong> · 第 ' + w.forecast.dueTurn + ' 回合变化');
    else if (w.nextChangeTurn) rows += row('固化', '本模式的天候由局势决定，下一次判定在第 ' + w.nextChangeTurn + ' 回合');
    if (w.eventForecast) {
      const e = w.eventForecast;
      rows += row('公共事件', '<strong>' + escapeHTML(e.name) + '</strong> · 第 ' + e.dueTurn + ' 回合'
        + (e.strong ? '<span class="weather-badge">' + escapeHTML(e.strongLabel) + '</span>' : '')
        + (e.target ? '<br>' + escapeHTML(e.target) : ''));
    }
    if (w.fog) {
      const f = w.fog;
      rows += row('墓碑', '场上 ' + f.graves + ' 个（≥4 雾夜，≤3 初晖）');
      if (f.forcedRemaining) rows += row('强制雾夜', '剩余 ' + f.forcedRemaining + ' 回合');
      if (f.dawnRemaining) rows += row('初晖锁定', '剩余 ' + f.dawnRemaining + ' 回合');
      if (f.round12Warning) rows += row('第12回合', '墓地补至 6 个，并强制雾夜 3 回合');
      const source = f.source === 'override' ? '调试覆盖' : f.source === 'forced' ? '强制窗口' : f.source === 'dawn' ? '初晖锁定' : '墓碑数量';
      rows += row('判定来源', source);
    }
    if (w.sinceTurn !== undefined) rows += row('起始', '第 ' + w.sinceTurn + ' 回合');
    return rows;
  }

  function cardHelpModel(card, options) {
    const opts = options || {};
    const entries = opts.entries || [];
    return {
      title: '【' + (card ? card.name : '') + '】',
      meta: '⚡ ' + (card ? card.cost : '?') + ' 技能点 · 卡牌 #' + (card ? card.id : '?'),
      desc: card ? card.desc : '',
      note: opts.note || '',
      keywordsHTML: entries.map((kw) => '<div class="kw"><b>' + escapeHTML(kw.key) + '</b>' + escapeHTML(kw.text) + '</div>').join('')
    };
  }

  root.ChaosUI = Object.freeze({
    escapeHTML, cardKeywordEntries, unitFigureHTML,
    UNIT_ICONS, ARMORY_ICONS, unitDisplayName, unitGlyph,
    cardType, skillCardHTML, logClass, toast, cellHighlightClass,
    unitBadgeExtras, unitBadgeHTML, weatherChipHTML, weatherDetailRows, cardHelpModel,
    combatFeedback
  });

  // 联机/单机共用的战斗反馈：棋盘轻震 + 中央点数浮字。
  // 由两端各自传入自己的棋盘和浮层宿主，避免两套会话层再复制一份动画代码。
  function combatFeedback(line, options) {
    const opts = options || {};
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const boards = opts.boards
      ? Array.from(opts.boards)
      : Array.from(document.querySelectorAll('.battlefield'));
    boards.forEach((board) => {
      board.classList.remove('combat-pulse');
      void board.offsetWidth;
      board.classList.add('combat-pulse');
      setTimeout(() => board.classList.remove('combat-pulse'), 320);
    });
    const host = typeof opts.host === 'string'
      ? document.querySelector(opts.host)
      : (opts.host || document.querySelector('.map-stack'));
    if (!host) return;
    const msg = String(line || '');
    const number = msg.match(/点数:(\d+)/);
    const text = number ? '⚔ ' + number[1]
      : /消灭/.test(msg) ? '💀 消灭'
      : /混乱/.test(msg) ? '🌀 混乱'
      : /反击/.test(msg) ? '⚡ 反击'
      : '⚔';
    const float = document.createElement('div');
    float.className = 'combat-float';
    float.textContent = text;
    host.appendChild(float);
    setTimeout(() => float.remove(), 900);
  }
})(typeof window !== 'undefined' ? window : globalThis);
