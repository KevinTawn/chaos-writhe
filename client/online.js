/* 混乱与蠕动 · 联机客户端
 * 职责：渲染服务器下发的可见状态、发送指令、断线重连。
 * 不包含任何规则判定，也不生成随机数。
 */
(function () {
  'use strict';

  const C = window.ChaosConstants;
  if (!C) { alert('共享常量加载失败，请通过服务器地址访问。'); return; }
  const COLS = C.COLS, ROWS = C.ROWS, SKILL_CARD_MAP = C.SKILL_CARD_MAP, MODE_NAMES = C.MODE_NAMES;
  // 2.5D 战场：近大远小的逐行缩放（第 0 行在最远处）
  const D_ROW_SCALE = [0.86, 0.91, 0.96, 1.01, 1.05];
  const CARD_KEYWORD_HELP = C.CARD_KEYWORD_HELP || {}, CARD_NOTES = C.CARD_NOTES || {};
  const UNIT_ICONS = window.ChaosUI.UNIT_ICONS;
  const ARMORY_ICONS = window.ChaosUI.ARMORY_ICONS;
  const UNIT_FIGS = { '步兵': 'fig-inf', '车': 'fig-chariot', '炮兵': 'fig-cannon', '海炮': 'fig-sea-cannon', '地雷': 'fig-mine', '后勤兵': 'fig-supply', '防御工事': 'fig-fort', '鬼魂': 'fig-ghost', '墓碑': 'fig-grave', '二阶步兵': 'fig-inf' };
  const ARMORY_FIGS = { '排雷兵': 'fig-inf', '掷弹兵': 'fig-inf', '工兵': 'fig-supply', '双发炮兵': 'fig-cannon', '装甲车': 'fig-chariot', '补给车': 'fig-supply', '二阶战车': 'fig-chariot', '指挥车': 'fig-chariot' };
  const NEON_FIGS = { '步兵': 'fig-neon-inf', '车': 'fig-neon-chariot', '炮兵': 'fig-neon-cannon', '海炮': 'fig-neon-sea-cannon', '地雷': 'fig-neon-mine', '后勤兵': 'fig-neon-supply', '防御工事': 'fig-neon-fort', '鬼魂': 'fig-neon-ghost', '墓碑': 'fig-neon-grave', '二阶步兵': 'fig-neon-inf', '排雷兵': 'fig-neon-inf', '掷弹兵': 'fig-neon-inf', '工兵': 'fig-neon-supply', '双发炮兵': 'fig-neon-cannon', '装甲车': 'fig-neon-chariot', '补给车': 'fig-neon-supply', '二阶战车': 'fig-neon-chariot', '指挥车': 'fig-neon-chariot' };

  function unitFigureId(unit) {
    if (!unit) return 'fig-inf';
    if (unit.type === '鬼魂' || unit.side === 'ghost') return 'fig-ghost';
    if ((unit.permaBuffs || []).includes('battle_damaged')) return 'fig-chariot-damaged';
    if ((unit.permaBuffs || []).includes('mechanical_wear')) return 'fig-chariot-worn';
    if (view.mode === 'neon' && NEON_FIGS[unit.armoryType || unit.type]) return NEON_FIGS[unit.armoryType || unit.type];
    if (view.mode === 'snow' && unit.type === '车') return 'fig-wolf';
    if (unit.armoryType && ARMORY_FIGS[unit.armoryType]) return ARMORY_FIGS[unit.armoryType];
    return UNIT_FIGS[unit.type] || 'fig-inf';
  }
  function unitFigureHTML(unit) {
    return window.ChaosUI.unitFigureHTML(unitFigureId(unit));
  }
  const SESSION_KEY = 'chaos-online-session';
  const SEATS_KEY = 'chaos-saved-seats';

  const $ = (id) => document.getElementById(id);
  const gridEl = $('battle-grid');
  const skyGridEl = $('sky-grid');
  const skyMapEl = $('sky-map');
  const mineGridEl = $('mine-grid');
  const mineMapEl = $('mine-map');
  const REDUCED_MOTION = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  let ws = null;
  let connecting = false;
  let session = null;           // { roomId, token, side }
  let room = null;              // 服务器房间元信息
  let view = null;              // 个人视角状态
  let opponentConnected = false;
  let selectedDeployType = null;
  let removeMode = false;
  let reconnectTimer = null;
  let reconnectAttempt = 0;
  let intentionalClose = false;
  let toastTimer = null;
  let snowEffectToken = 0;
  let snowFxHeavy = null;
  let lastLogSignature = '';
  let previousLogs = [];
  let drawPeekTimer = null;
  let drawSignature = '';
  let handOpen = false;
  let pendingSeatRoom = null;
  let pendingJoinRoom = null;
  let rematchRequested = false;
  let lastUnits = new Map();     // 上一次渲染的可见单位位置（用于移动动画）
  let animationBoardKey = null;  // 房间 + 模式；换局时重置动画基线

  init();

  // ──────────────────────────────────────────────────────────────────────────
  // 连接
  // ──────────────────────────────────────────────────────────────────────────
  function init() {
    bindEvents();
    syncModeCards();
    try {
      const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
      if (saved && saved.roomId && saved.token) session = saved;
    } catch { session = null; }
    if (window.ChaosAuth && ChaosAuth.onChange) {
      ChaosAuth.onChange(state => {
        if (state && state.loggedIn && !connected() && !connecting) connect();
      });
    }
    connect();
  }

  async function connect() {
    if (connecting) return;
    connecting = true;
    try {
    let ticket = '';
    try {
      if (window.ChaosAuth) {
        const issued = await window.ChaosAuth.getTicket();
        ticket = issued && issued.ticket ? issued.ticket : '';
      }
    } catch (error) {
      // 生产模式没有登录态：停止匿名重连，打开登录入口。
      if (error && (error.status === 401 || error.status === 403)) {
        setConnectionState('offline');
        $('connection-text').textContent = '请先登录账号';
        if (window.ChaosAuth && ChaosAuth.openLogin) ChaosAuth.openLogin();
        return;
      }
      // 开发服务器还没有 Ticket 接口时，允许回退到开发模式匿名连接。
      console.warn('[auth] ticket unavailable, fallback to anonymous:', error && error.message);
    }
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const runtime = window.CHAOS_RUNTIME_CONFIG || {};
    let wsBase = runtime.gameServer || location.host;
    if (/^https?:\/\//i.test(wsBase)) wsBase = wsBase.replace(/^http/i, 'ws');
    else if (!/^wss?:\/\//i.test(wsBase)) wsBase = proto + '//' + wsBase;
    const suffix = ticket ? (wsBase.includes('?') ? '&' : '?') + 'ticket=' + encodeURIComponent(ticket) : '';
    ws = new WebSocket(wsBase + suffix);
    setConnectionState('connecting');
    ws.addEventListener('open', () => {
      setConnectionState('online');
      reconnectAttempt = 0;
      if (session && session.roomId && session.token) {
        send({ type: 'rejoin', roomId: session.roomId, token: session.token });
      }
    });
    ws.addEventListener('message', (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }
      handleMessage(msg);
    });
    ws.addEventListener('close', () => {
      setConnectionState('offline');
      if (!intentionalClose) scheduleReconnect();
    });
    ws.addEventListener('error', () => { });
    } finally { connecting = false; }
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectAttempt++;
    const delay = Math.min(8000, 500 * Math.pow(1.7, Math.min(6, reconnectAttempt)));
    $('connection-text').textContent = `连接断开，${Math.round(delay / 100) / 10} 秒后重连…（第 ${reconnectAttempt} 次）`;
    $('connection-strip').hidden = false;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  }

  function setConnectionState(state) {
    if (state === 'online') {
      $('connection-strip').hidden = true;
    } else if (state === 'offline') {
      $('connection-strip').hidden = false;
      if (!$('connection-text').textContent.includes('重连')) $('connection-text').textContent = '连接已断开';
    } else {
      $('connection-text').textContent = '正在连接服务器…';
      $('connection-strip').hidden = false;
    }
    updateReadyAvailability();
  }

  function connected() { return ws && ws.readyState === WebSocket.OPEN; }

  function send(message) {
    if (!connected()) { toast('尚未连接到服务器'); return false; }
    ws.send(JSON.stringify(message));
    return true;
  }

  function sendCmd(command) {
    if (!view) { toast('对局尚未开始'); return; }
    send({ type: 'cmd', command });
  }

  function saveSession() {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  }

  // 浏览器级席位记忆：sessionStorage 关闭标签页会丢失，localStorage 用于「输入房间号恢复席位」。
  function loadSavedSeats() {
    try { return JSON.parse(localStorage.getItem(SEATS_KEY) || '[]'); } catch { return []; }
  }
  function saveSeat(seat) {
    if (!seat || !seat.roomId || !seat.token) return;
    const list = loadSavedSeats().filter(s => !(s.roomId === seat.roomId && s.side === seat.side));
    list.push({ roomId: seat.roomId, side: seat.side, token: seat.token, at: Date.now() });
    try { localStorage.setItem(SEATS_KEY, JSON.stringify(list.slice(-10))); } catch { /* ignore */ }
  }
  function savedSeatsFor(roomId) {
    return loadSavedSeats()
      .filter(s => s.roomId === roomId)
      .sort((a, b) => (a.side === 'red' ? 0 : 1) - (b.side === 'red' ? 0 : 1));
  }
  function removeSavedRoom(roomId) {
    if (!roomId) return;
    try { localStorage.setItem(SEATS_KEY, JSON.stringify(loadSavedSeats().filter(s => s.roomId !== roomId))); } catch { /* ignore */ }
  }

  function clearSession() {
    session = null; view = null; room = null;
    sessionStorage.removeItem(SESSION_KEY);
    closeHandPreview();
    resetUnitAnimation();
    showLobby();
  }

  function resetUnitAnimation() {
    lastUnits = new Map();
    animationBoardKey = null;
  }

  // 主动离开后保留席位 token：可从大厅「回到之前的房间」返回。
  function leaveToLobby() {
    const finished = view && view.gameOver;
    const keep = session;
    view = null; room = null;
    selectedDeployType = null; removeMode = false;
    closeHandPreview();
    resetUnitAnimation();
    if (finished) { clearSession(); return; }
    session = keep;
    if (session) saveSession();
    showLobby();
    toast('已离开房间，可点击「回到之前的房间」返回');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 消息处理
  // ──────────────────────────────────────────────────────────────────────────
  function handleMessage(msg) {
    switch (msg.type) {
      case 'joined': {
        session = { roomId: msg.room.roomId, token: msg.token, side: msg.you };
        rematchRequested = false;
        saveSession();
        saveSeat(session);
        closeSeatChooser();
        pendingJoinRoom = null;
        room = msg.room;
        showRoom();
        if (room.started) showGame();
        break;
      }
      case 'room': {
        room = msg.room;
        if (room.started && view) showGame();
        else if (!room.started) showRoom();
        renderRoomPanel();
        if (view && view.gameOver) renderVictory();
        break;
      }
      case 'state': {
        view = msg.view;
        opponentConnected = !!msg.opponentConnected;
        if (!view.gameOver) rematchRequested = false;
        if (msg.roomId) {
          if (!session) session = { roomId: msg.roomId, token: '', side: msg.you };
          else session.roomId = msg.roomId;
        }
        showGame();
        render();
        playFx(msg.fx);
        break;
      }
      case 'error': {
        const message = msg.message || '操作失败';
        if (pendingJoinRoom && /房间已满/.test(message)) {
          const saved = savedSeatsFor(pendingJoinRoom);
          const roomId = pendingJoinRoom;
          pendingJoinRoom = null;
          if (saved.length) { openSeatChooser(roomId, saved); break; }
        }
        if (pendingJoinRoom) pendingJoinRoom = null;
        toast(message);
        break;
      }
      case 'rejoin_failed': {
        toast(msg.reason || '无法恢复对局');
        removeSavedRoom(msg.roomId || (session && session.roomId));
        clearSession();
        break;
      }
      case 'room_closed': {
        toast(msg.reason || '房间已关闭');
        removeSavedRoom(msg.roomId || (session && session.roomId));
        clearSession();
        break;
      }
      case 'left': {
        leaveToLobby();
        break;
      }
      default:
        break;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 大厅 / 房间
  // ──────────────────────────────────────────────────────────────────────────
  function showLobby() {
    if (window.ChaosMusic) window.ChaosMusic.setScene({ area: 'lobby' });
    document.body.className = 'lobby-view';
    document.body.dataset.weather = '';
    hideSnowEffect();
    if (window.ChaosWeatherFX) window.ChaosWeatherFX.clear();
    $('lobby').hidden = false;
    $('game').hidden = true;
    $('lobby-actions').hidden = false;
    $('room-panel').hidden = true;
    $('drawOverlay').style.display = 'none';
    $('victoryOverlay').style.display = 'none';
    $('targetHint').style.display = 'none';
    closeHandPreview();
    // 回到大厅时恢复模式选择：离开房间/对局后不应残留“非房主/对局中”的禁用状态。
    const modeSelect = $('mode-select');
    if (modeSelect) modeSelect.disabled = false;
    syncModeCards();
    updateReturnButton();
  }

  function updateReturnButton() {
    const btn = $('return-game-btn');
    if (!btn) return;
    const canReturn = !!(session && session.roomId && session.token);
    btn.hidden = !canReturn;
    if (canReturn) $('return-room-id').textContent = session.roomId;
    const resetBtn = $('reset-lobby-btn');
    if (resetBtn) resetBtn.hidden = !canReturn;
  }

  function openSeatChooser(roomId, seats) {
    pendingSeatRoom = roomId;
    $('seatPromptText').textContent = `房间 ${roomId} 在本浏览器保存了席位，请选择返回身份。`;
    const box = $('seatChoices');
    box.innerHTML = '';
    for (const seat of seats) {
      const btn = document.createElement('button');
      btn.className = 'big-btn';
      btn.dataset.side = seat.side;
      btn.textContent = seat.side === 'red' ? '🔴 以红方席位返回' : '🔵 以蓝方席位返回';
      btn.addEventListener('click', () => {
        closeSeatChooser();
        send({ type: 'join_room', roomId, token: seat.token });
      });
      box.appendChild(btn);
    }
    $('seatOverlay').style.display = 'flex';
  }

  function closeSeatChooser() {
    pendingSeatRoom = null;
    const overlay = $('seatOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  function showRoom() {
    if (!room) return;
    if (room.started) { showGame(); return; }
    if (window.ChaosMusic) window.ChaosMusic.setScene({ area: 'lobby' });
    document.body.className = 'lobby-view';
    document.body.dataset.weather = '';
    hideSnowEffect();
    if (window.ChaosWeatherFX) window.ChaosWeatherFX.clear();
    $('lobby').hidden = false;
    $('game').hidden = true;
    $('lobby-actions').hidden = true;
    $('room-panel').hidden = false;
    renderRoomPanel();
  }

  function showGame() {
    $('lobby').hidden = true;
    $('game').hidden = false;
  }

  function renderRoomPanel() {
    if (!room) return;
    $('room-code-display').textContent = room.roomId;
    $('room-mode-label').textContent = MODE_NAMES[room.mode] || room.mode;
    const isHost = session && session.side === 'red';
    const modeSelect = $('mode-select');
    modeSelect.value = room.mode;
    modeSelect.disabled = !isHost;
    syncModeCards();

    const red = room.players.red, blue = room.players.blue;
    const redState = red.ready ? '已准备' : (red.connected ? '在线' : '等待重连');
    const blueState = !blue.joined ? '等待加入' : (blue.ready ? '已准备' : (blue.connected ? '在线' : '等待重连'));
    $('slot-red-state').textContent = redState;
    $('slot-blue-state').textContent = blueState;
    $('slot-red-tag').textContent = session && session.side === 'red' ? '你 · 房主' : '房主';
    $('slot-red-tag').className = 'slot-tag' + (red.connected ? ' online' : '');
    $('slot-blue-tag').textContent = session && session.side === 'blue' ? '你' : '';
    $('slot-blue-tag').className = 'slot-tag' + (blue.connected ? ' online' : '');
    $('slot-red').classList.toggle('me', !!session && session.side === 'red');
    $('slot-blue').classList.toggle('me', !!session && session.side === 'blue');

    const me = session ? room.players[session.side] : null;
    const readyBtn = $('ready-btn');
    readyBtn.textContent = me && me.ready ? '↩️ 取消准备' : '✅ 准备';
    readyBtn.disabled = !connected() || !blue.joined;
    readyBtn.title = blue.joined ? '' : '等待对手加入';
    $('room-hint').textContent = !blue.joined
      ? '把房间号发给对手，等待对方加入。'
      : (red.ready && blue.ready ? '双方已准备，正在开始…' : '双方点击「准备」后开始对局。');
  }

  function syncModeCards() {
    const selected = $('mode-select').value;
    const host = !room || (session && session.side === 'red' && !room.started);
    document.querySelectorAll('.mode-card').forEach((btn) => {
      const active = btn.dataset.mode === selected;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.disabled = !host;
    });
    syncModeDetails(selected);
  }

  function syncModeDetails(mode) {
    const cards = Array.from(document.querySelectorAll('.mode-card'));
    const index = Math.max(0, cards.findIndex((card) => card.dataset.mode === mode));
    const card = cards[index];
    if (!card) return;
    const data = card.dataset;
    const setText = (id, text) => { const el = $(id); if (el) el.textContent = text; };
    setText('mode-eyebrow', '阵式 ' + (data.no || '') + ' · ' + (data.en || ''));
    setText('mode-title', data.name || '');
    setText('mode-en', data.en || '');
    setText('mode-brief', data.brief || '');
    setText('mode-quote', data.quote || '');
    setText('orb-no', (data.no || '') + ' / ' + (data.index || String(index + 1).padStart(2, '0')));
    const points = $('mode-points');
    if (points) {
      points.innerHTML = (data.points || '').split('|').filter(Boolean)
        .map((point) => '<li>' + point + '</li>').join('');
    }
    const accent = data.accent || '#8ad9b4';
    document.body.style.setProperty('--st-accent', accent);
    const icon = $('orb-icon');
    const use = card.querySelector('.mode-icon use');
    if (icon && use) {
      icon.innerHTML = '<svg viewBox="0 0 24 24"><use href="' + use.getAttribute('href') + '"></use></svg>';
    }
    const needle = $('needle');
    if (needle) needle.style.transform = 'translateX(-50%) rotate(' + (index * 36) + 'deg)';
  }

  function updateReadyAvailability() {
    if (room && !room.started && !$('room-panel').hidden) {
      renderRoomPanel();
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 按钮绑定
  // ──────────────────────────────────────────────────────────────────────────
  function bindEvents() {
    function syncLobbyPlayMode() {
      const play = $('lobby-play-mode') ? $('lobby-play-mode').value : 'online';
      const local = play !== 'online';
      if ($('room-code-input')) $('room-code-input').disabled = local;
      if ($('join-room-btn')) $('join-room-btn').disabled = local;
      if ($('create-room-btn')) $('create-room-btn').innerHTML = local
        ? (play === 'ai' ? '开始 AI 对战 <span class="arrow">→</span>' : '开始单机热座 <span class="arrow">→</span>')
        : '开拔 · 创建房间 <span class="arrow">→</span>';
      const note = document.querySelector('#lobby-actions .obs-note');
      if (note) note.textContent = local ? '选择星位后直接进入单机战场；无需房间号。' : '选定星位后创建房间，或凭六位房号入席。';
    }
    $('create-room-btn').addEventListener('click', () => {
      const play = $('lobby-play-mode') ? $('lobby-play-mode').value : 'online';
      const mode = $('mode-select').value;
      if (play !== 'online') {
        location.href = '/local?mode=' + encodeURIComponent(mode) + '&ai=' + (play === 'ai' ? '1' : '0') + '&autostart=1';
        return;
      }
      send({ type: 'create_room', mode });
    });
    $('join-room-btn').addEventListener('click', () => {
      if ($('lobby-play-mode') && $('lobby-play-mode').value !== 'online') return;
      const roomId = ($('room-code-input').value || '').trim().toUpperCase();
      if (roomId.length !== 6) return toast('请输入 6 位房间号');
      // 同一标签页内的会话：直接返回。
      const ownToken = session && session.roomId === roomId ? session.token : undefined;
      if (ownToken) { pendingJoinRoom = null; return send({ type: 'join_room', roomId, token: ownToken }); }
      // 先按新玩家加入；只有房间已满时，才尝试用本浏览器保存的席位恢复。
      pendingJoinRoom = roomId;
      send({ type: 'join_room', roomId });
    });
    $('seatNewBtn').addEventListener('click', () => {
      const roomId = pendingSeatRoom;
      closeSeatChooser();
      if (roomId) send({ type: 'join_room', roomId });
    });
    $('seatCancelBtn').addEventListener('click', closeSeatChooser);
    $('seatOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeSeatChooser(); });
    $('return-game-btn').addEventListener('click', () => {
      if (!session || !session.token) { clearSession(); return toast('没有可返回的房间'); }
      send({ type: 'rejoin', roomId: session.roomId, token: session.token });
    });
    $('reset-lobby-btn').addEventListener('click', () => {
      if (!window.confirm('重置大厅状态？这会放弃「回到之前的房间」，之后需重新输入房间号才能回去。')) return;
      clearSession();
      toast('已重置大厅状态');
    });
    $('room-code-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('join-room-btn').click(); });
    $('lobby-play-mode') && $('lobby-play-mode').addEventListener('change', syncLobbyPlayMode);
    syncLobbyPlayMode();
    $('mode-select').addEventListener('change', () => {
      syncModeCards();
      if (session && session.side === 'red' && room && !room.started) send({ type: 'set_mode', mode: $('mode-select').value });
    });
    document.querySelectorAll('.mode-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const select = $('mode-select');
        select.value = btn.dataset.mode;
        select.dispatchEvent(new Event('change'));
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if ($('lobby').hidden || $('lobby-actions').hidden) return;
      const target = e.target;
      if (target && /^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(target.tagName)) return;
      const cards = Array.from(document.querySelectorAll('.mode-card'));
      if (!cards.length) return;
      e.preventDefault();
      const current = Math.max(0, cards.findIndex((card) => card.dataset.mode === $('mode-select').value));
      const next = (current + (e.key === 'ArrowRight' ? 1 : cards.length - 1)) % cards.length;
      const select = $('mode-select');
      select.value = cards[next].dataset.mode;
      select.dispatchEvent(new Event('change'));
    });
    $('ready-btn').addEventListener('click', () => {
      if (!room || !session) return;
      const me = room.players[session.side];
      send({ type: 'ready', ready: !(me && me.ready) });
    });
    $('leave-btn').addEventListener('click', () => send({ type: 'leave' }));
    $('closeHandBtn').addEventListener('click', closeHandPreview);
    $('handOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeHandPreview(); });
    $('armorySkipBtn').addEventListener('click', () => {
      if (!view || !view.can.armoryChoose) return;
      sendCmd({ type: 'armory_choose', unit: null });
    });
    $('armory-deploy-btn').addEventListener('click', () => {
      if (!view || !view.can.deploy) return;
      const type = $('armory-deploy-btn').dataset.type;
      if (!type) return;
      selectedDeployType = selectedDeployType === type ? null : type;
      removeMode = false;
      renderDeployPanel();
    });
    $('drawPeekBtn').addEventListener('click', startDrawPeek);
    $('drawPeekBack').addEventListener('click', stopDrawPeek);
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if ($('weatherOverlay').classList.contains('show')) { closeWeather(); return; }
      if ($('cardHelpOverlay').classList.contains('show')) { closeCardHelp(); return; }
      if (handOpen) closeHandPreview();
      if (pendingSeatRoom) closeSeatChooser();
    });
    $('copy-room-btn').addEventListener('click', async () => {
      if (!room) return;
      try { await navigator.clipboard.writeText(room.roomId); toast('房间号已复制'); }
      catch { toast('房间号：' + room.roomId); }
    });

    document.querySelectorAll('.deploy-btn[data-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!view || !view.can.deploy) return;
        const type = btn.dataset.type;
        if (selectedDeployType === type) { selectedDeployType = null; removeMode = false; }
        else { selectedDeployType = type; removeMode = false; }
        renderDeployPanel();
      });
    });
    $('remove-mode-btn').addEventListener('click', () => {
      if (!view || !view.can.deploy) return;
      removeMode = !removeMode;
      if (removeMode) selectedDeployType = null;
      renderDeployPanel();
    });
    $('deploy-done-btn').addEventListener('click', () => sendCmd({ type: 'finish_deploy' }));

    $('toggle-sky-btn').addEventListener('click', () => {
      if (!skyMapEl) return;
      skyMapEl.classList.toggle('collapsed');
      const collapsed = skyMapEl.classList.contains('collapsed');
      $('toggle-sky-btn').textContent = collapsed ? '展开' : '收起';
      $('toggle-sky-btn').setAttribute('aria-expanded', String(!collapsed));
    });
    $('draw-btn').addEventListener('click', () => sendCmd({ type: 'draw_open' }));
    $('use-card-btn').addEventListener('click', () => {
      if (!view || !view.can.useCard) return;
      const my = view.my;
      const needConfirm = !view.doubleCardMode && my.smoothComboRemainingRounds > 0 && my.skillsUsedThisTurn === 0;
      if (needConfirm) {
        if (window.confirm('本回合是否使用两张技能卡？')) sendCmd({ type: 'use_card_enter', doubleCard: true });
        else sendCmd({ type: 'use_card_enter', doubleCard: false });
      } else {
        sendCmd({ type: 'use_card_enter', doubleCard: false });
      }
    });
    $('play-card-btn').addEventListener('click', () => sendCmd({ type: 'play_card' }));
    $('start-action-btn').addEventListener('click', () => sendCmd({ type: 'start_action' }));
    $('end-turn-btn').addEventListener('click', () => sendCmd({ type: 'end_turn' }));
    $('tide-purge-btn').addEventListener('click', () => sendCmd({ type: 'tide_mode', mode: 'purge' }));
    $('tide-mark-btn').addEventListener('click', () => sendCmd({ type: 'tide_mode', mode: 'mark' }));
    $('cancel-btn').addEventListener('click', () => sendCmd({ type: 'cancel' }));
    $('cancelDrawBtn').addEventListener('click', () => sendCmd({ type: 'draw_cancel' }));
    $('rerollDrawBtn').addEventListener('click', () => sendCmd({ type: 'draw_reroll' }));
    $('finishTargetBtn').addEventListener('click', () => sendCmd({ type: 'finish_target' }));
    $('cancelTargetBtn').addEventListener('click', () => sendCmd({ type: 'cancel_target' }));

    $('view-cards-btn').addEventListener('click', openHandPreview);
    // 联机版不提供查看地雷按钮；服务端也会拒绝 reveal/mines 指令。
    $('view-enemy-btn').addEventListener('click', () => sendCmd({ type: 'reveal', kind: 'enemy' }));
    $('wannanIncidentAccept').addEventListener('click', () => sendCmd({ type: 'wannan_incident', accept: true }));
    $('wannanIncidentDecline').addEventListener('click', () => sendCmd({ type: 'wannan_incident', accept: false }));

    $('rules-btn').addEventListener('click', () => window.open('/rules', '_blank'));
    $('codex-btn').addEventListener('click', () => window.open('/codex', '_blank'));
    $('surrender-btn').addEventListener('click', () => {
      if (!view || view.gameOver) return;
      if (!window.confirm('确定投降？本局将立即结束，对方获胜。')) return;
      sendCmd({ type: 'surrender' });
    });
    $('exit-game-btn').addEventListener('click', () => {
      if (!window.confirm('确定离开当前对局？离开后可从大厅「回到之前的房间」返回。')) return;
      const finished = view && view.gameOver;
      send({ type: 'leave' });
      if (finished) clearSession();
      // 未结束：等待服务器回 left 后进入大厅并保留返回按钮
    });
    $('victoryLeaveBtn').addEventListener('click', () => {
      send({ type: 'leave' });
      clearSession();
    });
    $('rematchBtn').addEventListener('click', () => {
      if (!view || !view.gameOver) return;
      rematchRequested = true;
      send({ type: 'rematch' });
      renderVictory();
    });
    $('exportReplayBtn').addEventListener('click', exportReplay);
    $('cardHelpClose').addEventListener('click', closeCardHelp);
    $('cardHelpOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeCardHelp(); });
    $('weather-chip').addEventListener('click', openWeather);
    $('weatherClose').addEventListener('click', closeWeather);
    $('weatherOverlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeWeather(); });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 渲染
  // ──────────────────────────────────────────────────────────────────────────
  function render() {
    if (!view) return;

    // 先对比上一帧与当前帧的可见单位，生成移动/出现/消失动画计划。
    const boardKey = (session ? session.roomId : '') + '|' + view.mode;
    const currentUnits = new Map();
    for (const unit of view.units) {
      currentUnits.set(String(unit.id), { id: unit.id, x: unit.x, y: unit.y, type: unit.type, side: unit.side, layer: unitLayer(unit) });
    }
    let animationPlan = null;
    if (animationBoardKey === boardKey && lastUnits.size > 0) {
      animationPlan = buildUnitAnimationPlan(lastUnits, currentUnits);
    }
    animationBoardKey = boardKey;

    applyBodyMode();
    renderStatus();
    renderGrid();
    if (view.mode === 'holy') renderSkyGrid();
    if (view.mode === 'mine') renderMineGrid();
    applyUnitAnimations(animationPlan);
    lastUnits = currentUnits;
    renderLibraries();
    renderDeployPanel();
    renderArmoryOverlay();
    renderActionButtons();
    renderTargetHint();
    renderWannanIncidentOverlay();
    renderDrawOverlay();
    if (handOpen) renderHandPreview();
    renderLogs();
    renderVictory();
    renderOpponentStatus();
    $('game-room').textContent = session ? session.roomId : (view.roomId || '—');
    syncMusic();
  }

  function syncMusic() {
    if (!window.ChaosMusic) return;
    if (!view || $('game').hidden) {
      window.ChaosMusic.setScene({ area: 'lobby' });
      return;
    }
    const winner = String(view.winner || '');
    const winSide = /红/.test(winner) ? 'red' : (/蓝/.test(winner) ? 'blue' : null);
    const mySide = session && (session.side === 'red' || session.side === 'blue') ? session.side : null;
    window.ChaosMusic.setScene({
      area: 'game',
      mode: view.mode,
      weather: view.weather,
      phase: view.mode === 'wannan' && view.incident && view.incident.triggered ? 2 : 1,
      gameOver: !!view.gameOver,
      defeat: !!(view.gameOver && mySide && winSide && winSide !== mySide)
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 单位移动动画：服务器只同步前后状态，这里按可见单位位置差分补间。
  // ──────────────────────────────────────────────────────────────────────────
  function buildUnitAnimationPlan(previous, current) {
    const plan = { moves: [], spawned: [], removed: [] };
    for (const [id, now] of current) {
      const before = previous.get(id);
      if (!before) { plan.spawned.push(now); continue; }
      const beforeLayer = before.layer || 'ground';
      const nowLayer = now.layer || 'ground';
      if (before.x !== now.x || before.y !== now.y || beforeLayer !== nowLayer) {
        plan.moves.push({
          id: now.id, type: now.type, side: now.side,
          fromX: before.x, fromY: before.y, x: now.x, y: now.y,
          fromLayer: beforeLayer, toLayer: nowLayer,
          ghost: now.type === '鬼魂'
        });
      }
    }
    for (const [id, before] of previous) {
      if (current.has(id)) continue;
      if (shouldSkipVanish(before)) continue;
      plan.removed.push(before);
    }
    return plan;
  }

  // 隐藏信息导致的“消失”不能播放淡出，否则会短暂暴露地雷 / 雾夜鬼魂位置。
  function shouldSkipVanish(unit) {
    if (unit.type === '地雷') return true;
    if (unit.type === '鬼魂' && !view.reveal.ghosts) return true;
    if (view.phase === 'DEPLOY' && unit.side !== view.viewerSide && ['red','blue'].includes(unit.side)) return true;
    return false;
  }

  function applyUnitAnimations(plan) {
    if (!plan || REDUCED_MOTION) return;
    const badgeMap = new Map();
    for (const board of [gridEl, skyGridEl, mineGridEl]) {
      if (!board) continue;
      board.querySelectorAll('[data-unit-id]').forEach((el) => {
        const key = String(el.dataset.unitId);
        if (!badgeMap.has(key)) badgeMap.set(key, el);
      });
    }
    const cellOf = (layer, x, y) => {
      const board = layer === 'sky' ? skyGridEl : layer === 'mine' ? mineGridEl : gridEl;
      return board ? board.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`) : null;
    };

    for (const unit of plan.moves) {
      const badge = badgeMap.get(String(unit.id));
      const fromLayer = unit.fromLayer || 'ground';
      const toLayer = unit.toLayer || 'ground';
      const fromCell = cellOf(fromLayer, unit.fromX, unit.fromY);
      const toCell = cellOf(toLayer, unit.x, unit.y);
      if (!badge || !fromCell || !toCell) continue;
      const manhattan = Math.abs(unit.x - unit.fromX) + Math.abs(unit.y - unit.fromY);
      const sameLayer = fromLayer === toLayer;
      const slide = !sameLayer || unit.fromX === unit.x || unit.fromY === unit.y || manhattan <= 2;
      if (slide) animateUnitSlide(badge, fromCell, toCell, unit);
      else animateUnitWarp(badge, fromCell, toCell, unit);
    }

    for (const unit of plan.spawned) {
      const badge = badgeMap.get(String(unit.id));
      if (badge) badge.classList.add('unit-appear');
    }

    for (const unit of plan.removed) {
      const cell = cellOf(unit.layer || 'ground', unit.x, unit.y);
      if (!cell) continue;
      const vanish = document.createElement('div');
      vanish.className = 'unit-vanish';
      vanish.innerHTML = `<span class="unit-icon">${unitFigureHTML(unit)}</span><span class="unit-name">${unit.type}</span>`;
      cell.appendChild(vanish);
      setTimeout(() => vanish.remove(), 420);
    }
  }

  function animateUnitSlide(badge, fromCell, toCell, unit) {
    const from = fromCell.getBoundingClientRect();
    const to = toCell.getBoundingClientRect();
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    const crossLayer = (unit.fromLayer || 'ground') !== (unit.toLayer || 'ground');
    const steps = Math.max(Math.abs(unit.x - unit.fromX), Math.abs(unit.y - unit.fromY));
    const duration = crossLayer ? 380 : Math.min(520, 190 + steps * 55);

    toCell.style.zIndex = '8';
    badge.classList.add('unit-moving');
    if (crossLayer) badge.classList.add('unit-cross-layer');
    badge.style.transition = 'none';
    badge.style.transform = `translate(${dx}px, ${dy}px)`;
    void badge.offsetWidth; // 强制回流，确保从旧位置开始
    requestAnimationFrame(() => {
      badge.style.transition = `transform ${duration}ms cubic-bezier(.22,.68,.32,1)`;
      badge.style.transform = 'translate(0, 0)';
    });

    spawnMovementTrail(unit, duration);

    setTimeout(() => {
      badge.classList.remove('unit-moving', 'unit-cross-layer');
      badge.style.transition = '';
      badge.style.transform = '';
      toCell.style.zIndex = '';
    }, duration + 60);
  }

  // 跃迁 / 换位等非直线移动：旧位置淡出、新位置淡入，避免穿墙滑行。
  function animateUnitWarp(badge, fromCell, toCell, unit) {
    const vanish = document.createElement('div');
    vanish.className = 'unit-vanish';
    vanish.innerHTML = `<span class="unit-icon">${unitFigureHTML(unit)}</span><span class="unit-name">${unit.type}</span>`;
    fromCell.appendChild(vanish);
    badge.classList.add('unit-appear');
    setTimeout(() => vanish.remove(), 420);
  }

  function spawnMovementTrail(unit, duration) {
    if ((unit.fromLayer || 'ground') !== (unit.toLayer || 'ground')) return;
    const path = [{ x: unit.fromX, y: unit.fromY }];
    const manhattan = Math.abs(unit.x - unit.fromX) + Math.abs(unit.y - unit.fromY);
    if (unit.fromX === unit.x || unit.fromY === unit.y || manhattan <= 2) {
      let x = unit.fromX, y = unit.fromY;
      const dx = Math.sign(unit.x - unit.fromX);
      const dy = Math.sign(unit.y - unit.fromY);
      while (x !== unit.x || y !== unit.y) {
        x += dx; y += dy;
        if (x === unit.x && y === unit.y) break; // 终点由单位本体占据
        path.push({ x, y });
      }
    }
    const icon = unitAnimationIcon(unit);
    path.forEach((pos, index) => {
      const cell = gridEl.querySelector(`.cell[data-x="${pos.x}"][data-y="${pos.y}"]`);
      if (!cell) return;
      const trail = document.createElement('span');
      trail.className = 'unit-trail';
      trail.textContent = icon;
      trail.style.animationDelay = `${Math.min(160, index * 35)}ms`;
      trail.style.animationDuration = `${Math.max(280, duration)}ms`;
      cell.appendChild(trail);
      setTimeout(() => trail.remove(), Math.max(300, duration) + 320 + index * 35);
    });
  }

  function unitAnimationIcon(unit) {
    if (view.mode === 'snow' && unit.type === '车') return '🐺';
    return UNIT_ICONS[unit.type] || '?';
  }

  function hideSnowEffect() {
    snowEffectToken++;
    snowFxHeavy = null;
    const canvas = $('snow-canvas');
    if (!canvas) return;
    canvas.style.display = 'none';
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  /* 雪原飘雪：与单机热座同款 canvas 粒子；小雪 60 片、大雪 160 片。 */
  function initSnowEffect(force) {
    const canvas = $('snow-canvas');
    if (!canvas) return;
    const on = !!(view && view.mode === 'snow');
    if (!on) {
      snowEffectToken++;
      snowFxHeavy = null;
      canvas.style.display = 'none';
      const oldCtx = canvas.getContext('2d');
      if (oldCtx) oldCtx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    const w = view.weather;
    const heavy = !!(w && w.mode === 'snow' && w.level === 2);
    const width = window.innerWidth, height = window.innerHeight;
    canvas.style.display = 'block';
    if (!force && snowFxHeavy === heavy && canvas.width === width && canvas.height === height) return;
    snowFxHeavy = heavy;
    const token = ++snowEffectToken;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = width;
    canvas.height = height;
    canvas.style.opacity = heavy ? '1' : '.72';
    const flakes = [];
    const count = heavy ? 160 : 60;
    for (let i = 0; i < count; i++) {
      flakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: heavy ? Math.random() * 3.2 + 1.2 : Math.random() * 3 + 1,
        speed: heavy ? Math.random() * 1.8 + 1 : Math.random() * 1 + 0.5,
        wind: heavy ? Math.random() * 1.1 - .55 : Math.random() * 0.5 - 0.25
      });
    }
    function drawSnow() {
      if (token !== snowEffectToken) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = heavy ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.82)';
      ctx.beginPath();
      for (const f of flakes) {
        ctx.moveTo(f.x, f.y);
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        f.y += f.speed;
        f.x += f.wind;
        if (f.y > canvas.height) { f.y = -5; f.x = Math.random() * canvas.width; }
        if (f.x > canvas.width) f.x = 0;
        if (f.x < 0) f.x = canvas.width;
      }
      ctx.fill();
      if (!REDUCED_MOTION && token === snowEffectToken && view && view.mode === 'snow') {
        requestAnimationFrame(drawSnow);
      }
    }
    drawSnow();
  }

  function applyBodyMode() {
    if (!view) return;
    const classes = ['game-view', view.mode + '-mode'];
    if (view.mode === 'fog' && !view.fogNight) classes.push('fog-dawn');
    document.body.className = classes.join(' ');
    const holy = view.mode === 'holy';
    if (skyMapEl) skyMapEl.hidden = !holy;
    if (mineMapEl) mineMapEl.hidden = view.mode !== 'mine';
    $('ground-label').hidden = !(holy || view.mode === 'mine');
    const mineLabel = $('mine-vision-label');
    if (mineLabel && view.mode === 'mine' && view.mine) {
      const mine = view.mine;
      mineLabel.textContent = `视野 2 格 · 己方井下 ${mine.underground[view.viewerSide]} · 对方井下 ${mine.underground[view.viewerSide === 'red' ? 'blue' : 'red']}`;
    }
    initSnowEffect(false);
  }

  // 查看技能卡：把按钮移到己方牌库标题下方，避免玩家在顶部与牌库之间来回找。
  function placeViewCardsButton(state) {
    const btn = $('view-cards-btn');
    if (!btn) return;
    const side = state.viewerSide === 'blue' ? 'blue' : 'red';
    const host = $(side + '-library-tools');
    if (host && btn.parentElement !== host) host.appendChild(btn);
    for (const key of ['red', 'blue']) {
      const tools = $(key + '-library-tools');
      if (tools) tools.hidden = !(key === side && state.can.viewCards);
    }
  }

  function renderStatus() {
    const p = view.players;
    const soul = view.mode === 'fog';
    const tag = (side) => (view.viewerSide === side ? ' · 你' : '');
    const redEl = document.querySelector('.red-info');
    const blueEl = document.querySelector('.blue-info');
    redEl.classList.toggle('me', view.viewerSide === 'red');
    blueEl.classList.toggle('me', view.viewerSide === 'blue');
    const chip = (icon, value, cls = '') => `<span class="stat-chip${cls ? ' ' + cls : ''}">${icon}<b>${value}</b></span>`;
    const infoHtml = (side) => {
      const player = p[side];
      const score = view.holyScore ? chip('🏅', `${view.holyScore[side]}/${view.holyScore.target}`, 'score') : '';
      const souls = soul ? chip('💀', view.soulCount[side], 'soul') : '';
      return `<span class="faction-crest" aria-hidden="true"></span>`
        + `<span class="f-name"><strong>${view.factionNames[side]}${tag(side)}</strong><span>${view.viewerSide === side ? '本方指挥' : '敌方指挥'}</span></span>`
        + `<span class="f-stats">${chip('💰', player.resources, 'res') + chip('🎯', player.cmd, 'cmd') + chip('⚡', player.sp, 'sp') + score + souls}</span>`;
    };
    $('red-info-text').innerHTML = infoHtml('red');
    $('blue-info-text').innerHTML = infoHtml('blue');
    redEl.dataset.faction = 'red';
    blueEl.dataset.faction = 'blue';
    redEl.dataset.mode = blueEl.dataset.mode = view.mode;

    let text;
    if (view.gameOver) text = '对局结束';
    else if (view.phase === 'ARMORY') text = '🏪 军火库 · 选择开局补给';
    else if (view.phase === 'DEPLOY') {
      const ready = view.deployReady || { red: false, blue: false };
      const mark = (side) => (ready[side] ? '✓' : '…');
      const myReady = !!ready[view.viewerSide];
      text = `🛒 部署阶段 · 红方${mark('red')} 蓝方${mark('blue')}${myReady ? ' · 等待对方完成部署' : ''}`;
    }
    else {
      const human = view.activeSide === 'red' || view.activeSide === 'blue';
      const phaseName = view.turnPhase === 'DRAW' ? '抽卡' : view.turnPhase === 'USE_CARD' ? '用卡' : view.turnPhase === 'REINFORCE' ? '增援部署' : human ? '行动' : '自动行动';
      text = `⚡ ${view.factionNames[view.activeSide]} · ${phaseName} · 回${view.turn}`;
      if (view.mode === 'wannan' && view.incident && view.incident.antiJapanesePeriod && view.wannanFriction) text += ` · ⚡摩擦${view.wannanFriction}/3`;
      if (view.mode === 'beacon' && view.beacon) text += ` · 🏯红${view.beacon.counts.red}/3 蓝${view.beacon.counts.blue}/3`;
      if (view.mode === 'neon' && view.neon) {
        const target = view.neon.protocolTarget || 5;
        text += ` · 🛰️红${view.neon.protocols.red}/${target} 蓝${view.neon.protocols.blue}/${target}`;
        text += ` · 📦地${(view.neon.packets || []).length} 红携${view.neon.carried ? view.neon.carried.red : 0} 蓝携${view.neon.carried ? view.neon.carried.blue : 0}`;
        if (view.neon.event) text += ` · 📡下回${view.neon.event.icon}${view.neon.event.name}`;
        else if (view.neon.activeEvent) text += ` · 📡${view.neon.activeEvent}`;
      }
      if (view.endgameAttackBonus) text += ` · ⚔️终局+${view.endgameAttackBonus}`;
      if (view.wannanPending && !view.wannanPrompt) text += ' · ⚡等待对方决定城邦裂变';
    }
    $('phase-text').textContent = text;
    renderWeather(view);

    // 作战室 HUD：回合数与当前行动方
    const roundNo = $('round-no');
    if (roundNo) {
      roundNo.textContent = view.gameOver ? '终 局'
        : (view.phase === 'ARMORY' || view.phase === 'DEPLOY') ? '布 阵'
        : `第 ${view.turn} 回合`;
    }
    const hudRed = $('hud-red'), hudBlue = $('hud-blue');
    if (hudRed && hudBlue) {
      const active = !view.gameOver && (view.phase !== 'ARMORY' && view.phase !== 'DEPLOY') ? view.activeSide : null;
      hudRed.classList.toggle('active', active === 'red');
      hudBlue.classList.toggle('active', active === 'blue');
    }
    const hint = $('action-hint');
    if (hint) {
      const me = p[view.viewerSide];
      hint.textContent = me ? `资源 ${me.resources} · 指挥 ${me.cmd} · 技能 ${me.sp}` : '';
    }

    const show = (id, on) => { $(id).style.display = on ? 'inline-block' : 'none'; };
    placeViewCardsButton(view);
    show('view-cards-btn', view.can.viewCards);
    // 联机版不再提供查看地雷按钮（服务端同样拒绝）。
    show('view-mines-btn', false);
    document.getElementById('view-mines-btn').disabled = true;
    show('view-enemy-btn', view.can.viewEnemy);
    // 联机版不提供主动查看鬼魂；单机版的查看按钮仅供测试。
    show('ghost-view-btn', false);
  }

  function renderWeather(state) {
    const chip = $('weather-chip');
    if (!chip) return;
    if (state && state.mode === 'neon' && state.neon) {
      const n = state.neon;
      if (n.activeEvent || n.event) {
        const label = n.activeEvent ? '公共事件' : '事件预报';
        const effect = n.activeEvent
          ? ((n.activeEventIcon || '📡') + ' ' + (n.activeEventName || n.activeEvent))
          : (n.event.icon + ' ' + n.event.name + ' · 回' + n.event.dueTurn);
        chip.innerHTML = '<span class="wx-icon">📡</span><span class="wx-label">' + label + '</span>'
          + '<span class="wx-effect">' + effect + '</span>'
          + (n.event && n.activeEvent ? '<span class="wx-sep">/</span><span class="wx-next">下回 ' + n.event.icon + ' ' + n.event.name + '</span>' : '');
        chip.title = n.activeEvent ? ('公共事件：' + (n.activeEventName || n.activeEvent)) : '事件预报';
        chip.style.display = 'inline-flex';
        document.body.dataset.weather = '';
        if (window.ChaosWeatherFX) window.ChaosWeatherFX.clear();
        return;
      }
    }
    const w = state && state.weather;
    if (!w) {
      chip.style.display = 'none';
      document.body.dataset.weather = '';
      if (window.ChaosWeatherFX) window.ChaosWeatherFX.clear();
      return;
    }
    chip.innerHTML = window.ChaosUI.weatherChipHTML(w);
    chip.title = `天候：${w.label} · ${w.shortEffect}（点击查看详情）`;
    chip.style.display = 'inline-flex';
    document.body.dataset.weather = w.mode === 'snow'
      ? (w.level === 2 ? 'snow-heavy' : 'snow-light')
      : (w.mode === 'fog' ? w.kind : (w.mode === 'classic' ? 'classic-' + w.kind : w.mode));
    if (window.ChaosWeatherFX) window.ChaosWeatherFX.set(w);
  }

  function weatherDetailRow(label, value) {
    return `<div class="weather-row"><span class="weather-k">${label}</span><span class="weather-v">${value}</span></div>`;
  }

  function openWeather() {
    if (!view || !view.weather) return;
    const w = view.weather;
    $('weatherTitle').textContent = `【${w.label}】`;
    let rows = window.ChaosUI.weatherDetailRows(w);
    $('weatherDetail').innerHTML = `<div class="weather-hero"><span class="wx-big">${w.icon}</span><div><strong>${w.label}</strong><small>`
      + `${w.decorative ? '仅表现 · 不影响规则' : '公开信息 · 双方均可见'}</small></div></div>`
      + `${rows}<div class="weather-note">天候与预报在双方界面同时公开；预报只在本回合内有效。规则以规则页「六、天候系统」为准。</div>`;
    $('weatherOverlay').classList.add('show');
  }

  function closeWeather() {
    $('weatherOverlay').classList.remove('show');
  }

  function renderOpponentStatus() {
    const el = $('opponent-status');
    if (!view) return;
    if (view.gameOver) { el.textContent = '对局结束'; el.className = 'conn-dot'; return; }
    if (opponentConnected) { el.textContent = '对手：在线'; el.className = 'conn-dot online'; }
    else { el.textContent = '对手：等待重连…'; el.className = 'conn-dot offline'; }
  }

  // ── 棋盘 ────────────────────────────────────────────────────────────────
  const unitLayer = (unit) => (unit && unit.layer === 'sky' ? 'sky' : unit && unit.layer === 'mine' ? 'mine' : 'ground');

  function renderGrid() {
    gridEl.innerHTML = '';
    const mainByCell = new Map();
    const ghostsByCell = new Map();
    for (const unit of view.units) {
      if (unitLayer(unit) !== 'ground') continue;
      const key = unit.x + ',' + unit.y;
      if (unit.type === '鬼魂') ghostsByCell.set(key, unit);
      else if (!mainByCell.has(key)) mainByCell.set(key, unit);
    }
    const selectedUnit = view.units.find((u) => u.id === view.selectedUnitId);
    const selectedIsGround = !!selectedUnit && unitLayer(selectedUnit) === 'ground';
    const selectedIsSky = !!selectedUnit && unitLayer(selectedUnit) === 'sky';
    const selectedIsMine = !!selectedUnit && unitLayer(selectedUnit) === 'mine';
    const diveAttack = selectedIsSky && (view.actionTiles || []).some((t) => t.layer === 'sky' && t.type === 'dive' && t.attack);
    const actionMap = new Map((view.actionTiles || []).filter((t) => (t.layer || 'ground') === 'ground').map((t) => [t.x + ',' + t.y, t]));
    const target = view.skillTarget;
    const targetTiles = new Set(((target && target.validTiles) || []).filter((t) => (t.layer || 'ground') === 'ground').map((t) => t.x + ',' + t.y));
    const targetSelected = new Set(((target && target.selected) || []).filter((t) => (t.layer || 'ground') === 'ground').map((t) => t.x + ',' + t.y));
    const marks = new Set((view.dragonMarks || []).map((m) => m.x + ',' + m.y));
    const warningCells = new Set(((view.eruptionWarning && view.eruptionWarning.cells) || []).map((c) => c.x + ',' + c.y));

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const key = x + ',' + y;
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.x = x; cell.dataset.y = y; cell.dataset.col = x;
        cell.setAttribute('role', 'button');
        cell.setAttribute('tabindex', '0');
        cell.setAttribute('aria-label', `格子 ${x},${y}`);
        applyModeCellStyle(cell, x, y);
        cell.style.setProperty('--s', String(D_ROW_SCALE[y] || 1));
        if (view.mode === 'holy' && (x <= 2 || x >= 8)) cell.classList.add('holy-territory');
        decorateCell(cell, x, y);

        const unit = mainByCell.get(key);
        if (unit) {
          renderUnitBadge(cell, unit);
          if (selectedIsGround && view.selectedUnitId === unit.id) cell.classList.add('selected');
          if (unit.acted && unit.side !== 'ghost') cell.classList.add('acted');
        }
        if (marks.has(key)) {
          const mark = document.createElement('span');
          mark.className = 'dragon-mark';
          mark.textContent = '🐉';
          mark.title = '龙属性标';
          cell.appendChild(mark);
        }
        const ghost = ghostsByCell.get(key);
        if (ghost) renderGhostOverlay(cell, ghost);
        if (view.mode === 'tide') renderTideCellExtras(cell, x, y);
        if (view.mode === 'beacon') renderBeaconCellExtras(cell, x, y);
        if (view.mode === 'neon') renderNeonCellExtras(cell, x, y);
        if (view.mode === 'mine') {
          const isPit = y === 2 && [0, 2, 5, 8, 10].includes(x);
          const isDrill = x === 5 && (y === 1 || y === 3);
          if (isDrill) cell.classList.add('mine-drill');
          if (isPit) cell.classList.add('mine-pit');
          if (isPit && !unit) {
            const locked = x === 5 && view.mine && !view.mine.centralOpen;
            const mark = document.createElement('span');
            mark.className = 'mine-pit-mark';
            mark.textContent = locked ? '⛓️' : '🕳️';
            mark.title = locked ? '中央竖井被矿主封锁' : '坑洞竖井：步兵可下井';
            cell.appendChild(mark);
          }
        }

        const tile = actionMap.get(key);
        if (tile) {
          if (tile.type === 'ascend' || tile.type === 'descend' || tile.type === 'engineer_build_mode' || tile.type === 'engineer_build' || tile.type === 'engineer_remove') cell.classList.add('special-action');
          else if (tile.type === 'purge') cell.classList.add('tide-purge-tile');
          else if (tile.type === 'mark') cell.classList.add('tide-mark-tile');
          else if (tile.type === 'beacon_ignite') cell.classList.add('beacon-ignite-tile');
          else cell.classList.add(tile.type === 'attack' ? 'attackable' : tile.type === 'heal' ? 'healable' : 'reachable');
          if (tile.type === 'descend') cell.classList.add('mine-descend-ready');
        }
        if (diveAttack && selectedUnit.x === x && selectedUnit.y === y) cell.classList.add('attackable');
        if (selectedIsSky && !diveAttack && selectedUnit.x === x && selectedUnit.y === y) cell.classList.add('sky-projection');
        if (warningCells.has(key)) {
          cell.classList.add('eruption-warning');
          const lave = document.createElement('span');
          lave.className = 'eruption-mark';
          lave.textContent = '🌋';
          lave.title = '下一回合火山喷发';
          cell.appendChild(lave);
        }
        if (targetTiles.has(key)) cell.classList.add(window.ChaosUI.cellHighlightClass({ attack: !!(target && target.skillId === 5), highlight: !(target && target.skillId === 5) }));
        if (targetSelected.has(key)) cell.classList.add('selected');

        if (isHardBlocked(x, y)) cell.classList.add('blocked-tile');
        if ((view.snowBlockedTiles || []).some((t) => t.x === x && t.y === y)) cell.classList.add('snow-blocked');

        cell.addEventListener('click', () => onCellClick(x, y, 'ground'));
        cell.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCellClick(x, y, 'ground'); }
        });
        gridEl.appendChild(cell);
      }
    }
  }

  function renderSkyGrid() {
    if (!skyGridEl) return;
    skyGridEl.innerHTML = '';
    const unitsByCell = new Map();
    for (const unit of view.units) {
      if (unitLayer(unit) !== 'sky') continue;
      unitsByCell.set(unit.x + ',' + unit.y, unit);
    }
    const selectedUnit = view.units.find((u) => u.id === view.selectedUnitId);
    const selectedIsSky = !!selectedUnit && unitLayer(selectedUnit) === 'sky';
    const actionMap = new Map((view.actionTiles || []).filter((t) => t.layer === 'sky').map((t) => [t.x + ',' + t.y, t]));
    const groundUnits = new Map();
    for (const unit of view.units) {
      if (unitLayer(unit) === 'ground') groundUnits.set(unit.x + ',' + unit.y, unit);
    }
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const key = x + ',' + y;
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.x = x; cell.dataset.y = y; cell.dataset.col = x;
        cell.setAttribute('role', 'button');
        cell.setAttribute('tabindex', '0');
        cell.setAttribute('aria-label', `天空格 ${x},${y}`);
        cell.dataset.layer = 'sky';
        decorateCell(cell, x, y);
        const groundUnit = groundUnits.get(key);
        const groundText = groundUnit
          ? `正下方：${view.factionNames[groundUnit.side]}${groundUnit.type}`
          : (x >= 4 && x <= 6 && y === 2 ? '正下方：火山底座' : '正下方：空');
        cell.title = groundText;
        if (x === 5 && y === 2) {
          cell.classList.add('sky-volcano', 'blocked-tile');
          cell.setAttribute('aria-label', '天空火山峰（不可通过）');
          const head = document.createElement('span');
          head.className = 'sky-volcano-head';
          head.setAttribute('aria-hidden', 'true');
          head.innerHTML = '<svg class="unit-fig" viewBox="0 0 40 40"><use href="#fig-volcano-head"/></svg>';
          cell.appendChild(head);
        }
        const unit = unitsByCell.get(key);
        if (unit) {
          renderUnitBadge(cell, unit);
          if (selectedIsSky && view.selectedUnitId === unit.id) cell.classList.add('selected');
          if (unit.acted) cell.classList.add('acted');
        }
        const tile = actionMap.get(key);
        if (tile) {
          if (tile.type === 'dive') {
            cell.classList.add(tile.attack ? 'dive-attack' : 'special-action');
            if (tile.attack) cell.title = `${groundText} · 可俯冲攻击`;
          } else cell.classList.add(tile.type === 'attack' ? 'attackable' : 'reachable');
        }
        const linked = () => {
          const target = gridEl.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
          if (target) target.classList.add('map-linked');
        };
        const unlinked = () => {
          const target = gridEl.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
          if (target) target.classList.remove('map-linked');
        };
        cell.addEventListener('mouseenter', linked);
        cell.addEventListener('mouseleave', unlinked);
        cell.addEventListener('focus', linked);
        cell.addEventListener('blur', unlinked);
        cell.addEventListener('click', () => onCellClick(x, y, 'sky'));
        cell.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCellClick(x, y, 'sky'); }
        });
        skyGridEl.appendChild(cell);
      }
    }
  }

  function renderMineGrid() {
    if (!mineGridEl || !view || view.mode !== 'mine' || !view.mine) return;
    mineGridEl.innerHTML = '';
    const m = view.mine;
    const unitsByCell = new Map();
    for (const unit of view.units) {
      if (unitLayer(unit) !== 'mine') continue;
      unitsByCell.set(unit.x + ',' + unit.y, unit);
    }
    const walls = new Set((m.walls || []).map((p) => p.x + ',' + p.y));
    const shafts = new Map((m.shafts || []).map((s) => [s.x + ',' + s.y, s]));
    const blocked = new Set((m.blocked || []).map((p) => p.x + ',' + p.y));
    const crystals = new Set((m.crystals || []).map((p) => p.x + ',' + p.y));
    const relics = new Set((m.relics || []).map((p) => p.x + ',' + p.y));
    const warning = new Set(((m.caveInWarning && m.caveInWarning.cells) || []).map((p) => p.x + ',' + p.y));
    const vision = new Set(m.vision || []);
    const selectedUnit = view.units.find((u) => u.id === view.selectedUnitId);
    const selectedIsMine = !!selectedUnit && unitLayer(selectedUnit) === 'mine';
    const actionMap = new Map((view.actionTiles || []).filter((t) => t.layer === 'mine').map((t) => [t.x + ',' + t.y, t]));
    const target = view.skillTarget;
    const targetTiles = new Set(((target && target.validTiles) || []).filter((t) => (t.layer || 'ground') === 'mine').map((t) => t.x + ',' + t.y));
    const targetSelected = new Set(((target && target.selected) || []).filter((t) => (t.layer || 'ground') === 'mine').map((t) => t.x + ',' + t.y));

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const key = x + ',' + y;
        const cell = document.createElement('div');
        cell.className = 'cell mine-cell';
        cell.dataset.x = x; cell.dataset.y = y; cell.dataset.col = x; cell.dataset.layer = 'mine';
        cell.setAttribute('role', 'button');
        cell.setAttribute('tabindex', '0');
        cell.setAttribute('aria-label', `矿洞格 ${x},${y}`);
        cell.style.setProperty('--s', String(D_ROW_SCALE[y] || 1));
        decorateCell(cell, x, y);
        if (walls.has(key)) cell.classList.add('mine-wall');
        if (blocked.has(key)) cell.classList.add('mine-collapsed');
        const shaft = shafts.get(key);
        if (shaft) {
          cell.classList.add('mine-shaft');
          if (shaft.central && !m.centralOpen) cell.classList.add('mine-shaft-locked');
        }
        if (!vision.has(key)) cell.classList.add('mine-fog');
        const occupied = unitsByCell.has(key);
        if (!occupied && !walls.has(key)) {
          if (x === 5 && y === 2 && !m.centralOpen && !m.bossDefeated) {
            cell.insertAdjacentHTML('beforeend', '<span class="mine-tile-mark" title="中央竖井被矿主封锁">⛓️</span>');
          } else if (shaft) {
            cell.insertAdjacentHTML('beforeend', '<span class="mine-tile-mark" title="竖井：可回到地面">🪜</span>');
          }
        }
        if (crystals.has(key)) cell.insertAdjacentHTML('beforeend', '<span class="mine-tile-mark mine-crystal" title="晶簇：拾取获得技能点+2">💎</span>');
        if (relics.has(key)) cell.insertAdjacentHTML('beforeend', '<span class="mine-tile-mark mine-relic" title="遗物：拾取获得一张技能卡">🏺</span>');
        if (warning.has(key)) {
          cell.classList.add('mine-cavein-warning');
          cell.insertAdjacentHTML('beforeend', '<span class="mine-tile-mark mine-warning" title="下回合塌方">⚠️</span>');
        }
        const unit = unitsByCell.get(key);
        if (unit) {
          renderUnitBadge(cell, unit);
          if (selectedIsMine && view.selectedUnitId === unit.id) cell.classList.add('selected');
          if (unit.acted) cell.classList.add('acted');
        }
        const tile = actionMap.get(key);
        if (tile) {
          if (tile.type === 'ascend') cell.classList.add('special-action');
          else cell.classList.add(tile.type === 'attack' ? 'attackable' : tile.type === 'heal' ? 'healable' : 'reachable');
        }
        if (targetTiles.has(key)) cell.classList.add(window.ChaosUI.cellHighlightClass({ attack: !!(target && target.skillId === 5), highlight: !(target && target.skillId === 5) }));
        if (targetSelected.has(key)) cell.classList.add('selected');
        cell.addEventListener('click', () => onCellClick(x, y, 'mine'));
        cell.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCellClick(x, y, 'mine'); }
        });
        mineGridEl.appendChild(cell);
      }
    }
  }

  function cardType(card) {
    return window.ChaosUI.cardType(card);
  }

  function decorateCell(cell, x, y) {
    const grain = document.createElement('span');
    grain.className = 'cell-grain';
    grain.setAttribute('aria-hidden', 'true');
    cell.appendChild(grain);
    const coord = document.createElement('span');
    coord.className = 'cell-coord';
    coord.textContent = `${x},${y}`;
    coord.setAttribute('aria-hidden', 'true');
    cell.appendChild(coord);
  }

  function renderUnitBadge(cell, unit) {
    const displayName = window.ChaosUI.unitDisplayName(unit);
    const icon = unit.side === 'monster'
      ? `<span class="mine-monster-icon">${unit.boss ? '🐍' : unit.beast ? '🐺' : '🦴'}</span>`
      : unitFigureHTML(unit);
    cell.insertAdjacentHTML('beforeend', window.ChaosUI.unitBadgeHTML({
      unit,
      className: unitColorClass(unit),
      name: displayName,
      unitType: displayName,
      unitId: unit.concealed ? null : unit.id,
      iconHTML: icon,
      glyph: window.ChaosUI.unitGlyph(unit),
      options: { neonCarry: view.mode === 'neon' ? unit.neonCarry : 0 }
    }));
  }

  function renderGhostOverlay(cell, ghost) {
    const overlay = document.createElement('div');
    overlay.className = 'unit-badge unit-ghost ghost-overlay';
    overlay.dataset.unitId = String(ghost.id);
    overlay.dataset.unitType = '鬼魂';
    overlay.innerHTML = '<span class="unit-token" aria-hidden="true"><span class="unit-icon">' + unitFigureHTML(ghost) + '</span></span><span class="unit-name">鬼魂</span>';
    cell.appendChild(overlay);
  }

  function unitColorClass(unit) {
    if (unit.side === 'ghost') return 'unit-ghost';
    if (unit.side === 'monster') return 'unit-monster';
    if (unit.side === 'imperial') return 'unit-imperial';
    if (view.mode === 'wannan') return unit.side === 'red' ? 'unit-red' : 'unit-blue';
    return unit.side === 'red' ? 'unit-red' : 'unit-blue';
  }

  function applyModeCellStyle(cell, x, y) {
    const mode = view.mode;
    cell.dataset.terrain = mode === 'classic' ? 'grass' : mode;
    if (mode === 'wannan') {
      cell.dataset.terrain = x <= 3 ? 'wannan-left' : x <= 6 ? 'wannan-mid' : 'wannan-right';
      cell.dataset.territory = x <= 3 ? 'red' : x <= 6 ? 'mid' : 'blue';
      if (x <= 3) { cell.style.background = 'linear-gradient(180deg,#8a5340 0%,#6e3a2e 55%,#54281f 100%)'; cell.style.boxShadow = 'inset 0 -4px 0 #3b1a14, inset 0 0 0 2px #b07a55, 0 3px 5px black'; }
      else if (x <= 6) { cell.style.background = 'linear-gradient(180deg,#b3a374 0%,#94865c 55%,#756a47 100%)'; cell.style.boxShadow = 'inset 0 -4px 0 #5a5136, inset 0 0 0 2px #d6c99c, 0 3px 5px black'; }
      else { cell.style.background = 'linear-gradient(180deg,#6f93a8 0%,#517a93 55%,#3a5f78 100%)'; cell.style.boxShadow = 'inset 0 -4px 0 #294457, inset 0 0 0 2px #a9c6d6, 0 3px 5px black'; }
    }
    if (mode === 'beacon') {
      const tower = (view.beacon && view.beacon.towers || []).find((t) => t.x === x && t.y === y);
      const gate = !!(view.beacon && (view.beacon.gates || []).some((g) => g.x === x && g.y === y));
      cell.dataset.terrain = tower ? 'beacon-tower' : gate ? 'beacon-gate' : 'beacon-field';
    }
    if (mode === 'neon') {
      const n = view.neon;
      const core = n && x === n.core.x && y === n.core.y;
      const ring = n && Math.abs(x - n.core.x) <= 1 && Math.abs(y - n.core.y) <= 1 && !core;
      cell.dataset.terrain = core ? 'neon-core' : ring ? 'neon-upload' : x <= 4 ? 'neon-red' : x >= 6 ? 'neon-blue' : 'neon-field';
    }
    if (mode === 'pirate') {
      const inConn = x >= 4 && x <= 6;
      const isDeck = y === 1 || y === 3;
      const boatPoint = (x === 3 || x === 7) && (y === 0 || y === 2 || y === 4);
      const v = view.pirateVortexTiles || [];
      const vortex = v.some((t) => t.x === x && t.y === y);
      cell.dataset.terrain = vortex ? 'vortex' : boatPoint ? 'boat' : (inConn && isDeck ? 'deck' : inConn ? 'water' : 'land');
      if (x === 5 && (y === 1 || y === 3)) {
        cell.style.cssText = 'background:radial-gradient(circle,#8a6a3a,#5a3a1a);border:3px solid #eeca5c;border-radius:50%;box-shadow:0 0 15px #eeca5c,inset 0 0 10px #3a2a1a';
      } else if (x === 5 && (y === 1 || y === 3)) {
        cell.style.background = '#8a7a3a';
      } else if (boatPoint) {
        cell.style.background = '#7a5a2a'; cell.style.boxShadow = 'inset 0 -4px 0 #5a3a0a, inset 0 0 0 2px #aa8050, 0 3px 5px black, 0 0 8px rgba(200,150,50,0.2)';
        const hasBoat = (view.pirateBoatPoints || []).some((p) => p.x === x && p.y === y && !p.used);
        if (hasBoat) cell.insertAdjacentHTML('beforeend', '<div style="position:absolute;font-size:16px;bottom:0;right:2px;opacity:.8;pointer-events:none;">⛵</div>');
      } else if (inConn && isDeck) {
        cell.style.background = '#8a6a2a'; cell.style.boxShadow = 'inset 0 -4px 0 #5a4a0a, inset 0 0 0 2px #b09050, 0 3px 5px black, inset 0 0 10px #9a8a5a';
      } else if (!inConn) {
        cell.style.background = '#6a4a1a'; cell.style.boxShadow = 'inset 0 -4px 0 #4a2a00, inset 0 0 0 2px #9a7050, 0 3px 5px black';
      } else {
        cell.style.background = '#1a4a7a'; cell.style.boxShadow = 'inset 0 -2px 8px #3a8aba, inset 0 2px 8px #0a2a4a, 0 3px 5px black';
        cell.classList.add('pirate-water-wave');
      }
      if (vortex) {
        cell.style.background = '#0a0a2a'; cell.classList.add('pirate-vortex');
        cell.insertAdjacentHTML('beforeend', '<div style="position:absolute;font-size:18px;opacity:.8;pointer-events:none;">🌀</div>');
      }
    }
    if (mode === 'fog') {
      cell.dataset.terrain = x >= 4 && x <= 6 ? 'fog-mid' : 'fog-land';
      if (x >= 4 && x <= 6) { cell.style.background = '#1a2a2a'; cell.style.boxShadow = 'inset 0 -4px 0 #0a1a1a, inset 0 0 0 2px #3a4a4a, 0 3px 5px black'; }
      else { cell.style.background = '#2a3a2a'; cell.style.boxShadow = 'inset 0 -4px 0 #1a2a1a, inset 0 0 0 2px #4a5a4a, 0 3px 5px black'; }
      cell.style.opacity = '.85';
    }
    if (mode === 'holy') {
      const volcano = x >= 4 && x <= 6 && y === 2;
      const orange = (x === 3 && y <= 2) || (x === 7 && y >= 2);
      const purple = (x === 4 && y <= 1) || (x === 5 && (y <= 1 || y >= 3)) || (x === 6 && y >= 3);
      const green = (x === 3 && y >= 3) || (x === 4 && y >= 3) || (x === 6 && y <= 1) || (x === 7 && y <= 1);
      cell.dataset.terrain = volcano ? 'volcano' : orange ? 'region-1' : purple ? 'region-2' : green ? 'region-3' : (x <= 2 || x >= 8) ? 'territory' : 'field';
      if (volcano) {
        cell.classList.add('volcano-base');
        cell.style.cursor = 'not-allowed';
      } else if (orange) { cell.style.background = '#8a5a2a'; }
      else if (purple) { cell.style.background = '#5a3a5a'; }
      else if (green) { cell.style.background = '#4a6a3a'; }
      else if (x <= 2 || x >= 8) { cell.style.background = '#6a5a3a'; }
      else { cell.style.background = '#5a7a3a'; }
    }
    if (mode === 'tide') {
      const t = view.tide || { eye: { x: 5, y: 2 }, cells: ['5,2'], preview: [], seals: {} };
      const tideCells = new Set(t.cells || []);
      const preview = new Set((t.preview || []).map((p) => p.x + ',' + p.y));
      const sealHere = ['red', 'blue'].some((side) => {
        const s = t.seals && t.seals[side];
        return s && s.x === x && s.y === y;
      });
      const eyeHere = (t.eye || { x: 5, y: 2 }).x === x && (t.eye || { x: 5, y: 2 }).y === y;
      const tideHere = tideCells.has(x + ',' + y);
      const redSide = x <= 4;
      cell.dataset.terrain = eyeHere ? 'tide-eye' : tideHere ? 'tide-cell' : sealHere ? 'tide-seal' : redSide ? 'tide-red' : 'tide-blue';
      if (eyeHere) {
        cell.style.background = 'radial-gradient(circle at 50% 55%, #7fe8dc 0%, #1f7f86 38%, #0b2f3c 74%, #061420 100%)';
        cell.style.boxShadow = 'inset 0 0 22px #5ff2e0, 0 0 18px rgba(60,220,210,.45)';
        cell.classList.add('tide-eye');
      } else if (tideHere) {
        cell.style.background = 'linear-gradient(160deg,#1d6d6a 0%,#14504f 55%,#0d3b40 100%)';
        cell.style.boxShadow = 'inset 0 0 14px #39c9b4, 0 3px 5px black';
        cell.classList.add('tide-cell');
      } else if (sealHere) {
        cell.style.background = 'radial-gradient(circle at 50% 45%, #b9b3a0 0%, #6f6a5c 45%, #3d3a33 100%)';
        cell.style.boxShadow = 'inset 0 0 12px #d8cfae, 0 3px 5px black';
      } else if (redSide) {
        cell.style.background = 'linear-gradient(180deg,#8a7a52 0%,#6f6040 60%,#574a31 100%)';
        cell.style.boxShadow = 'inset 0 -4px 0 #443a26, inset 0 0 0 2px #a99663, 0 3px 5px black';
        cell.dataset.territory = 'red';
      } else {
        cell.style.background = 'linear-gradient(180deg,#7a8770 0%,#5e6c58 60%,#46533f 100%)';
        cell.style.boxShadow = 'inset 0 -4px 0 #35412f, inset 0 0 0 2px #9aab8a, 0 3px 5px black';
        cell.dataset.territory = 'blue';
      }
      if (preview.has(x + ',' + y) && !tideHere && !sealHere) cell.classList.add('tide-preview');
    }
    if (mode === 'mine') {
      const pit = x === 0 && y === 2 || x === 2 && y === 2 || x === 5 && y === 2 || x === 8 && y === 2 || x === 10 && y === 2;
      const drill = x === 5 && (y === 1 || y === 3);
      const redTerritory = (x <= 3 && y <= 1) || (x <= 3 && y >= 3) || (x === 4 && (y === 0 || y === 4));
      const blueTerritory = (x >= 7 && y <= 1) || (x >= 7 && y >= 3) || (x === 6 && (y === 0 || y === 4));
      cell.dataset.terrain = pit ? 'pit' : drill ? 'drill' : redTerritory ? 'territory-red' : blueTerritory ? 'territory-blue' : 'mine-field';
      if (drill) {
        cell.style.background = 'linear-gradient(180deg,#5a5a5a 0%,#3a3a3a 20%,#1a1a1a 50%,#3a3a3a 80%,#5a5a5a 100%)';
        cell.style.cursor = 'not-allowed';
      } else if (pit) {
        cell.style.background = 'radial-gradient(circle at 50% 60%, #1a1a00 0%, #0a0a00 40%, #000 70%)';
      } else if (redTerritory || blueTerritory) { cell.style.background = '#6a6a3a'; }
      else { cell.style.background = '#4a4a2a'; }
    }
  }

  function renderTideCellExtras(cell, x, y) {
    const t = view.tide;
    if (!t) return;
    const eye = t.eye || { x: 5, y: 2 };
    if (eye.x === x && eye.y === y) {
      cell.classList.add('tide-eye');
      const token = document.createElement('span');
      token.className = 'tide-eye-token';
      token.textContent = '👁️';
      token.title = '潮眼：全场蠕潮的核心';
      cell.appendChild(token);
      return;
    }
    if ((t.cells || []).includes(x + ',' + y)) cell.classList.add('tide-cell');
    for (const side of ['red', 'blue']) {
      const s = t.seals && t.seals[side];
      if (!s || s.x !== x || s.y !== y) continue;
      cell.classList.add('tide-seal', 'tide-seal-' + side);
      const token = document.createElement('span');
      token.className = 'tide-seal-token';
      token.innerHTML = '<b>🏛️</b><i>' + s.hp + '/3</i>';
      token.title = `${view.factionNames[side]}镇石：${s.hp}/3`;
      cell.appendChild(token);
    }
    if ((t.marks || []).some((m) => m.x === x && m.y === y)) {
      const mark = document.createElement('span');
      mark.className = 'tide-mark-token';
      mark.textContent = '🌀';
      mark.title = '潮印：下次潮涌优先吞并';
      cell.appendChild(mark);
    }
    if ((t.preview || []).some((p) => p.x === x && p.y === y)
      && !(t.cells || []).includes(x + ',' + y)
      && !['red', 'blue'].some((side) => t.seals && t.seals[side] && t.seals[side].x === x && t.seals[side].y === y)) {
      const pv = document.createElement('span');
      pv.className = 'tide-preview-mark';
      pv.innerHTML = '<span class="tp-ripple"></span><span class="tp-wave">≈</span><span class="tp-label">潮汛</span>';
      pv.title = '下次潮涌预报：此格将被潮水吞没';
      cell.appendChild(pv);
    }
  }

  function renderBeaconCellExtras(cell, x, y) {
    const b = view.beacon;
    if (!b) return;
    const tower = (b.towers || []).find((t) => t.x === x && t.y === y);
    if (tower) {
      const lit = tower.lit || { red: false, blue: false };
      cell.classList.add('beacon-tower', 'beacon-tower-' + (tower.owner || 'neutral'));
      if (lit.red) cell.classList.add('beacon-tower-lit-red');
      if (lit.blue) cell.classList.add('beacon-tower-lit-blue');
      const canIgnite = (view.actionTiles || []).some((t) => t.x === x && t.y === y && t.type === 'beacon_ignite');
      if (canIgnite) cell.classList.add('beacon-ignite-tile');
      const token = document.createElement('span');
      token.className = 'beacon-tower-token';
      token.innerHTML = '<span class="bt-body"></span><span class="bt-flag"></span><span class="bt-fire"></span>';
      const faction = (side) => view.factionNames[side] || side;
      const litText = ['red', 'blue'].filter((side) => lit[side]).map((side) => faction(side) + '已点燃').join('、');
      const state = tower.owner ? faction(tower.owner) + '控制' : (litText ? litText + '，未控制' : '未点燃');
      token.title = `烽燧：${state}${canIgnite ? '（点击点燃，消耗 1 指挥点）' : ''}`;
      cell.appendChild(token);
      return;
    }
    if ((b.gates || []).some((g) => g.x === x && g.y === y)) {
      cell.classList.add('beacon-gate');
      const gate = document.createElement('span');
      gate.className = 'beacon-gate-token';
      gate.innerHTML = '<span class="bg-pillar bg-left"></span><span class="bg-pillar bg-right"></span><span class="bg-lintel"></span>';
      const occ = (view.units || []).find((u) => u.x === x && u.y === y && (u.layer || 'ground') === 'ground');
      gate.title = occ
        ? `关门：${(view.factionNames[occ.side] || occ.side)}${occ.type}正驻守此处`
        : '关门：长城唯一的地面通道';
      cell.appendChild(gate);
    }
  }

  function renderNeonCellExtras(cell, x, y) {
    const n = view.neon;
    if (!n) return;
    if (x === n.core.x && y === n.core.y) {
      cell.classList.add('neon-core');
      const token = document.createElement('span');
      token.className = 'neon-core-token';
      token.innerHTML = '<span class="neon-core-cube"><i></i><i></i><i></i><i></i></span><span class="neon-core-ring"></span>';
      token.title = `数据核心：红方协议 ${n.protocols.red}/${n.protocolTarget || 5} · 蓝方协议 ${n.protocols.blue}/${n.protocolTarget || 5}`;
      cell.appendChild(token);
      return;
    }
    if (Math.abs(x - n.core.x) <= 1 && Math.abs(y - n.core.y) <= 1) cell.classList.add('neon-upload');
    if (x <= 4) cell.classList.add('neon-territory-red');
    else if (x >= 6) cell.classList.add('neon-territory-blue');
    if (view.phase === 'DEPLOY' && Math.abs(x - n.core.x) <= 1 && Math.abs(y - n.core.y) <= 1) {
      cell.classList.add('neon-deploy-lock');
      const lock = document.createElement('span');
      lock.className = 'neon-deploy-lock-mark';
      lock.textContent = '⛔';
      lock.title = '喷包区：开局不可部署，单位可正常通行';
      cell.appendChild(lock);
    }
    for (const side of ['red', 'blue']) {
      const t = n.terminals && n.terminals[side];
      if (t && t.x === x && t.y === y) {
        cell.classList.add('neon-terminal', `neon-terminal-${side}`);
        const tok = document.createElement('span');
        tok.className = 'neon-terminal-token';
        tok.innerHTML = `<span class="neon-terminal-pad"></span><span class="neon-terminal-label">${side === 'red' ? '红方' : '蓝方'}终端</span>`;
        tok.title = `${side === 'red' ? '红方' : '蓝方'}上传终端：己方回合开始时，站在此格的非混乱单位自动上传全部数据包`;
        cell.appendChild(tok);
        const carrier = (view.units || []).some((u) => u.side === side && u.layer === 'ground' && u.x === x && u.y === y && u.neonCarry > 0);
        if (carrier) cell.classList.add('neon-upload-ready');
      }
    }
    const packets = (n.packets || []).filter((p) => p.x === x && p.y === y);
    if (packets.length) {
      const tok = document.createElement('span');
      tok.className = 'neon-packet-token';
      tok.innerHTML = `<span class="neon-packet-diamond">${packets.length > 1 ? '📦×' + packets.length : '◆'}</span>`;
      tok.title = `数据包 ×${packets.length}：地面单位可拾取，带回己方终端上传`;
      cell.appendChild(tok);
    }
    if (n.event && n.event.key === 'debris' && (n.event.tiles || []).some((t) => t.x === x && t.y === y)) {
      cell.classList.add('neon-event-warn');
      const mark = document.createElement('span');
      mark.className = 'neon-event-mark';
      mark.textContent = '☄️';
      mark.title = '轨道碎片预警：下回合开始时此格单位混乱 +1，工事/地雷被摧毁';
      cell.appendChild(mark);
    }
    if (n.activeEvent === 'nanofog' && x >= 4 && x <= 6) cell.classList.add('neon-nanofog');
  }

  function isHardBlocked(x, y) {
    if (view.mode === 'holy' && y === 2 && x >= 4 && x <= 6) return true;
    if (view.mode === 'mine' && x === 5 && (y === 1 || y === 3)) return true;
    if (view.mode === 'beacon' && x === 5 && (y === 0 || y === 2 || y === 4)) return true;
    if (view.mode === 'neon' && x === 5 && y === 2) return true;
    if (view.mode === 'tide' && view.tide) {
      const eye = view.tide.eye || { x: 5, y: 2 };
      if (eye.x === x && eye.y === y) return true;
      if ((view.tide.cells || []).includes(x + ',' + y)) return true;
      for (const side of ['red', 'blue']) {
        const s = view.tide.seals && view.tide.seals[side];
        if (s && s.x === x && s.y === y) return true;
      }
    }
    if ((view.blockedTiles || []).some((t) => t.x === x && t.y === y)) return true;
    return false;
  }

  // ── 牌库 ────────────────────────────────────────────────────────────────
  function renderLibraries() {
    for (const side of ['red', 'blue']) {
      const el = $(side + '-library');
      el.innerHTML = '';
      const isMine = view.viewerSide === side;
      const player = view.players[side];
      const countEl = $(side + '-library-count');
      if (countEl) countEl.textContent = `${isMine ? player.library.length : player.libraryCount} 张`;
      if (isMine) {
        if (!player.library.length) { el.innerHTML = '<span class="library-empty">牌库为空</span>'; continue; }
        for (const cid of player.library) {
          const card = SKILL_CARD_MAP[cid];
          const div = document.createElement('div');
          div.className = 'library-card';
          const canSelect = view.cardUseMode && view.activeSide === side && !view.skillTarget;
          if (canSelect) {
            div.classList.add('clickable');
            div.addEventListener('click', () => sendCmd({ type: 'select_card', cardId: cid }));
          } else {
            div.classList.add('clickable');
            div.title = '点击查看卡牌详情';
            div.addEventListener('click', () => openCardHelp(cid));
          }
          if (view.selectedCardId === cid) div.classList.add('selected-card');
          div.dataset.cardType = cardType(card);
          div.innerHTML = `<span class="card-name">${card ? card.name : cid}</span><span class="card-cost">⚡${card ? card.cost : '?'}</span>`;
          el.appendChild(div);
        }
      } else {
        if (!player.libraryCount) { el.innerHTML = '<span class="library-empty">牌库为空</span>'; continue; }
        for (let i = 0; i < player.libraryCount; i++) {
          const div = document.createElement('div');
          div.className = 'library-card hidden-card';
          div.innerHTML = '<span>⚡</span><span>?</span>';
          el.appendChild(div);
        }
      }
    }
  }

  // ── 控制区 ──────────────────────────────────────────────────────────────
  function renderDeployPanel() {
    const panel = $('deploy-panel');
    const visible = !!view.can.deploy;
    panel.hidden = !visible;
    if (!visible) return;
    const resources = view.my.resources;
    const logisticsCount = view.units.filter((u) => u.side === view.viewerSide && u.type === '后勤兵').length;
    panel.querySelectorAll('.deploy-btn[data-type]').forEach((btn) => {
      if (btn.id === 'armory-deploy-btn') return;
      const type = btn.dataset.type;
      const cost = (view.unitCosts && view.unitCosts[type] != null) ? view.unitCosts[type] : (C.UNIT_COST[type] || 0);
      if (btn.lastChild && btn.lastChild.nodeType === 3) btn.lastChild.textContent = ` ${type} ${cost}费`;
      let disabled = resources < cost;
      if (type === '后勤兵' && logisticsCount >= 1) disabled = true;
      btn.disabled = disabled;
      btn.classList.toggle('active', !removeMode && selectedDeployType === type);
    });
    $('remove-mode-btn').classList.toggle('active', removeMode);
    const armoryBtn = $('armory-deploy-btn');
    const armory = view.armory;
    if (armoryBtn) {
      if (armory && armory.choice && !armory.deployed) {
        armoryBtn.hidden = false;
        armoryBtn.dataset.type = armory.choice;
        armoryBtn.textContent = '🏪 ' + armory.choice + ' ' + (armory.choiceCost == null ? '?' : armory.choiceCost) + '费';
        armoryBtn.disabled = resources < (armory.choiceCost || 0);
        armoryBtn.classList.toggle('active', !removeMode && selectedDeployType === armory.choice);
      } else {
        armoryBtn.hidden = true;
        armoryBtn.dataset.type = '';
      }
    }
    $('deploy-done-btn').disabled = !view.can.finishDeploy;
  }

  function renderActionButtons() {
    const show = (id, on) => { $(id).hidden = !on; };
    show('draw-btn', view.can.draw);
    show('use-card-btn', view.can.useCard);
    show('play-card-btn', view.can.playCard);
    show('start-action-btn', view.can.startAction);
    const inAction = view.phase === 'ACTION' && !view.gameOver;
    const reinforc = view.turnPhase === 'REINFORCE';
    show('end-turn-btn', inAction && !reinforc);
    show('cancel-btn', inAction && !reinforc);
    show('tide-purge-btn', !!(view.tide && view.can.tidePurge));
    show('tide-mark-btn', !!(view.tide && view.can.tideMark));
    if (view.tide) {
      $('tide-purge-btn').classList.toggle('active', view.tide.mode === 'purge');
      $('tide-mark-btn').classList.toggle('active', view.tide.mode === 'mark');
      $('tide-purge-btn').disabled = !view.can.tidePurge;
      $('tide-mark-btn').disabled = !view.can.tideMark;
    }
    $('end-turn-btn').disabled = !view.can.endTurn;
    $('cancel-btn').disabled = !view.can.cancel;
    $('draw-btn').disabled = !view.can.draw;
    $('use-card-btn').disabled = !view.can.useCard;
    $('play-card-btn').disabled = !view.can.playCard;
    $('start-action-btn').disabled = !view.can.startAction;
    $('cancel-btn').hidden = view.phase !== 'ACTION' || view.gameOver;
  }

  function renderWannanIncidentOverlay() {
    const overlay = $('wannanIncidentOverlay');
    if (!overlay) return;
    if (!view || !view.wannanPrompt || view.gameOver) { overlay.classList.remove('show'); return; }
    overlay.classList.add('show');
    $('wannanIncidentTitle').textContent = (view.factionNames[view.viewerSide] || '') + '：是否点燃城邦裂变？';
    $('wannanIncidentText').textContent = `你方与对方已交火。斯巴达发动时获得1辆精锐装甲车、雅典获得2个二阶步兵；雅典发动时获得2门海炮、斯巴达获得2个二阶步兵。阵营名称与颜色不会改变。暂不发动则摩擦+1（当前${view.wannanFriction || 0}/3），摩擦达到3时自动发动。`;
  }

  function renderTargetHint() {
    const hint = $('targetHint');
    const req = view.skillTarget;
    if (!req) { hint.style.display = 'none'; return; }
    hint.style.display = 'flex';
    $('targetHintText').textContent = `${req.prompt}（${req.selected.length}/${req.count}）`;
    $('finishTargetBtn').style.display = view.can.finishTarget ? 'inline-block' : 'none';
    $('finishTargetBtn').disabled = !view.can.finishTarget;
    $('cancelTargetBtn').style.display = view.can.cancelTarget ? 'inline-block' : 'none';
  }

  function startDrawPeek() {
    if (!view || !view.draw) return;
    stopDrawPeek();
    const overlay = $('drawOverlay');
    overlay.classList.add('peeking');
    let left = 5;
    $('drawPeekCount').textContent = String(left);
    drawPeekTimer = setInterval(() => {
      left -= 1;
      if (left <= 0) { stopDrawPeek(); return; }
      $('drawPeekCount').textContent = String(left);
    }, 1000);
  }
  function stopDrawPeek() {
    if (drawPeekTimer) { clearInterval(drawPeekTimer); drawPeekTimer = null; }
    const overlay = $('drawOverlay');
    if (overlay) overlay.classList.remove('peeking');
    const count = $('drawPeekCount');
    if (count) count.textContent = '5';
  }

  function renderArmoryOverlay() {
    const overlay = $('armoryOverlay');
    if (!overlay) return;
    const a = view && view.armory;
    if (!a || a.phase !== 'ARMORY') { overlay.classList.remove('show'); return; }
    overlay.classList.add('show');
    $('armoryTitle').textContent = (view.factionNames[view.viewerSide] || '') + '军火库';
    const box = $('armoryOptions');
    box.innerHTML = '';
    const skip = $('armorySkipBtn');
    const wait = $('armoryWait');
    if (a.ready) {
      skip.hidden = true;
      wait.textContent = a.choice ? '已选择【' + a.choice + '】，等待对方完成选择…' : '已跳过军火库，等待对方完成选择…';
      return;
    }
    skip.hidden = false;
    wait.textContent = a.opponentReady ? '对方已完成选择，等待你…' : '双方同时选择，选择会记录在日志中';
    for (const item of a.options || []) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'armory-card ' + (item.tier === 'high' ? 'high' : 'low');
      card.innerHTML = '<h3>' + escapeHTML(item.key) + '</h3><div class="ac-cost">💰' + item.cost + '费</div><div class="ac-desc">' + escapeHTML(item.desc) + '</div>';
      card.addEventListener('click', () => {
        if (!view || !view.can.armoryChoose) return;
        sendCmd({ type: 'armory_choose', unit: item.key });
      });
      box.appendChild(card);
    }
  }

  function renderDrawOverlay() {
    const overlay = $('drawOverlay');
    const draw = view.draw;
    $('drawSpText').textContent = '⚡' + view.my.sp;
    if (!draw) { overlay.style.display = 'none'; drawSignature = ''; stopDrawPeek(); return; }
    overlay.style.display = 'flex';
    const signature = draw.choices.map((c) => c.id + ':' + c.cost).join(',') + '|' + draw.canCancel + '|' + draw.canReroll;
    if (signature === drawSignature) return;
    drawSignature = signature;
    const panel = $('drawCardPanel');
    panel.innerHTML = '';
    draw.choices.forEach((card) => {
      const item = document.createElement('div');
      item.className = 'draw-card' + (card.cost > view.my.sp ? ' cant-afford' : '');
      item.dataset.cardType = cardType(card);
      item.innerHTML = window.ChaosUI.skillCardHTML(card, { cost: card.cost, baseCost: card.baseCost });
      item.querySelector('.card-info-btn').addEventListener('click', (e) => { e.stopPropagation(); openCardHelp(card.id); });
      item.addEventListener('click', () => {
        if (card.cost > view.my.sp) return toast('技能点不足');
        sendCmd({ type: 'draw_pick', cardId: card.id });
      });
      panel.appendChild(item);
    });
    $('cancelDrawBtn').style.display = draw.canCancel ? 'inline-block' : 'none';
    const reroll = $('rerollDrawBtn'); if (reroll) reroll.style.display = draw.canReroll ? 'inline-block' : 'none';
  }

  // 己方手牌预览：仅使用本地已有的可见信息 + 共享卡牌常量，不向服务器发指令。
  function openHandPreview() {
    if (!view) return;
    handOpen = true;
    renderHandPreview();
    $('handOverlay').style.display = 'flex';
  }

  function closeHandPreview() {
    handOpen = false;
    const overlay = $('handOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  function renderHandPreview() {
    if (!handOpen || !view) return;
    const library = view.my.library;
    $('handTitle').textContent = `我的技能卡（${library.length}）`;
    const list = $('handCards');
    list.innerHTML = '';
    if (!library.length) {
      list.innerHTML = '<p class="hand-empty">牌库为空。抽卡获得的技能卡会显示在这里。</p>';
      return;
    }
    for (const cid of library) {
      const card = SKILL_CARD_MAP[cid];
      const item = document.createElement('div');
      item.className = 'draw-card hand-card';
      item.dataset.cardType = cardType(card);
      item.innerHTML = `<h3>${escapeHTML(card ? card.name : cid)}</h3><div class="cost">⚡${card ? card.cost : '?'}</div><div class="desc">${escapeHTML(card ? card.desc : '')}</div>`;
      item.style.cursor = 'pointer';
      item.addEventListener('click', () => openCardHelp(cid));
      list.appendChild(item);
    }
  }

  function renderLogs() {
    const signature = view.logs.join('\n');
    if (signature === lastLogSignature) return;
    lastLogSignature = signature;
    const panel = $('log-panel');
    const logClass = (line) => window.ChaosUI.logClass(line);
    const start = view.logs.length >= previousLogs.length ? previousLogs.length : 0;
    const fresh = view.logs.slice(start);
    previousLogs = view.logs.slice();
    panel.innerHTML = view.logs.map((line) => {
      const cls = logClass(line);
      return `<div class="log-entry${cls ? ' ' + cls : ''}">${escapeHTML(line)}</div>`;
    }).join('');
    panel.scrollTop = panel.scrollHeight;
    const combatLine = [...fresh].reverse().find((line) => /点数|消灭|混乱|反击|崩溃/.test(line));
    if (combatLine) pulseCombat(combatLine);
  }

  function pulseCombat(line = '') {
    if (window.ChaosUI && ChaosUI.combatFeedback) {
      ChaosUI.combatFeedback(line, {
        boards: document.querySelectorAll('.battlefield'),
        host: document.querySelector('.map-stack')
      });
      return;
    }
    if (REDUCED_MOTION) return;
    document.querySelectorAll('.battlefield').forEach((board) => {
      board.classList.remove('combat-pulse');
      void board.offsetWidth;
      board.classList.add('combat-pulse');
      setTimeout(() => board.classList.remove('combat-pulse'), 320);
    });
    const host = document.querySelector('.map-stack');
    if (!host) return;
    const number = line.match(/点数:(\d+)/);
    const text = number ? `⚔ ${number[1]}` : /消灭/.test(line) ? '💀 消灭' : /混乱/.test(line) ? '🌀 混乱' : /反击/.test(line) ? '⚡ 反击' : '⚔';
    const float = document.createElement('div');
    float.className = 'combat-float';
    float.textContent = text;
    host.appendChild(float);
    setTimeout(() => float.remove(), 900);
  }

  function renderVictory() {
    const overlay = $('victoryOverlay');
    if (!view.gameOver) { overlay.style.display = 'none'; rematchRequested = false; return; }
    overlay.style.display = 'flex';
    const winner = view.winner || '对局结束';
    overlay.dataset.winner = /红/.test(winner) ? 'red' : /蓝/.test(winner) ? 'blue' : 'draw';
    $('victoryText').textContent = '🎉 ' + winner;
    const status = $('rematchStatus');
    const votes = (room && room.rematch) || { red: false, blue: false };
    const me = session ? session.side : view.viewerSide;
    const other = me === 'red' ? 'blue' : 'red';
    const mine = rematchRequested || !!votes[me];
    if (!opponentConnected) {
      status.textContent = '对手已离开房间，无法再来一局';
      status.className = 'rematch-status';
      $('rematchBtn').disabled = true;
    } else if (mine && !votes[other]) {
      status.textContent = '已申请再来一局，等待对手确认…';
      status.className = 'rematch-status pending';
      $('rematchBtn').disabled = true;
    } else if (votes[other] && !mine) {
      status.textContent = '对手想再来一局，点击即可交换先后手重新开始';
      status.className = 'rematch-status pending';
      $('rematchBtn').disabled = false;
    } else {
      status.textContent = '双方确认后交换红蓝席位，沿用当前模式重新开局';
      status.className = 'rematch-status';
      $('rematchBtn').disabled = false;
    }
  }

  // ── 卡牌详情 ────────────────────────────────────────────────────────────
  function cardKeywordEntries(card) {
    return window.ChaosUI.cardKeywordEntries(card, CARD_KEYWORD_HELP);
  }

  function openCardHelp(cardId) {
    const card = SKILL_CARD_MAP[cardId];
    if (!card) return;
    const model = window.ChaosUI.cardHelpModel(card, {
      entries: cardKeywordEntries(card),
      note: CARD_NOTES[card.id]
    });
    $('cardHelpTitle').textContent = model.title;
    $('cardHelpMeta').textContent = model.meta;
    $('cardHelpDesc').textContent = model.desc;
    const note = $('cardHelpNote');
    note.textContent = model.note || '';
    note.classList.toggle('show', !!model.note);
    $('cardHelpKeywords').innerHTML = model.keywordsHTML;
    $('cardHelpOverlay').classList.add('show');
  }

  function closeCardHelp() {
    $('cardHelpOverlay').classList.remove('show');
  }

  // ── 对局记录导出（使用客户端已收到的日志，不额外向服务器请求） ──────────
  function exportReplay() {
    if (!view) return;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const units = view.units.map((u) => `${view.factionNames[u.side] || u.side} ${u.armoryType || u.type} (${u.x},${u.y})${u.chaos ? ' 混乱' + u.chaos : ''}`);
    const lines = [
      '混乱与蠕动 · 联机对局记录',
      '时间：' + date,
      '房间：' + (session ? session.roomId : (view.roomId || '—')),
      '模式：' + (MODE_NAMES[view.mode] || view.mode),
      '我方：' + (view.factionNames[view.viewerSide] || view.viewerSide),
      '回合：' + view.turn,
      '结果：' + (view.winner || '未结束'),
      '',
      '—— 当前可见单位 ——',
      ...(units.length ? units : ['（无）']),
      '',
      '—— 对局日志（最近 ' + view.logs.length + ' 条）——',
      ...view.logs
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `混乱与蠕动-联机-${session ? session.roomId : 'room'}-${now.getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast('已导出本局记录');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 交互
  // ──────────────────────────────────────────────────────────────────────────
  function onCellClick(x, y, layer = 'ground') {
    if (!view || view.gameOver) return;
    if (view.skillTarget) {
      if (layer !== 'ground' && layer !== 'mine') return toast('技能目标只能选择地面或矿洞');
      const valid = (view.skillTarget.validTiles || []).some((t) => t.x === x && t.y === y && (t.layer || 'ground') === layer);
      if (!valid) return toast('不是可选目标');
      sendCmd({ type: 'click', x, y, layer });
      return;
    }
    if (view.phase === 'DEPLOY') {
      if (layer !== 'ground') return;
      if (!view.can.deploy) {
        const ready = view.deployReady || {};
        return toast(ready[view.viewerSide] ? '你已完成部署，等待对方' : '等待对方部署');
      }
      if (removeMode) { sendCmd({ type: 'remove', x, y }); return; }
      if (!selectedDeployType) return toast('请先在下方选择兵种');
      sendCmd({ type: 'deploy', unitType: selectedDeployType, x, y });
      return;
    }
    if (view.phase !== 'ACTION') return;
    if (view.activeSide !== view.viewerSide) return toast('等待对方行动');
    if (view.turnPhase !== 'ACTION') {
      if (view.turnPhase === 'REINFORCE') return toast('定时补偿部署中，请完成部署');
      return toast('请先点击「⚔️ 行动」');
    }
    const selected = view.units.find((u) => u.id === view.selectedUnitId);
    const selectedLayer = selected ? (selected.layer === 'sky' ? 'sky' : selected.layer === 'mine' ? 'mine' : 'ground') : null;
    const tile = (view.actionTiles || []).find((t) =>
      t.x === x && t.y === y && (t.layer || 'ground') === layer && selectedLayer === layer);
    if (tile && tile.type === 'ascend') {
      // 圣辉是天空升空指令；矿洞的上井由服务端点击同一格结算。
      if (layer === 'mine') sendCmd({ type: 'click', x, y, layer: 'mine' });
      else sendCmd({ type: 'ascend' });
      return;
    }
    if (tile && tile.type === 'dive') { sendCmd({ type: 'dive' }); return; }
    sendCmd({ type: 'click', x, y, layer });
  }

  function toast(message) {
    if (window.ChaosUI && window.ChaosUI.toast) { window.ChaosUI.toast(message, { element: '#toast' }); return; }
    const el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function escapeHTML(text) {
    return window.ChaosUI.escapeHTML(text);
  }

  // 便于调试与自动化测试的只读/指令入口（不包含规则逻辑）。
  window.ChaosOnline = {
    send, sendCmd,
    getView: () => view,
    getRoom: () => room,
    getSession: () => session
  };

  // 炮弹动画（纯表现，不参与结算）
  function playFx(list) {
    if (!Array.isArray(list)) return;
    if (window.ChaosSfx) window.ChaosSfx.playFx(list);
    for (const fx of list) {
      if (!fx) continue;
      if (fx.type === 'cannon') {
        const from = gridEl.querySelector(`.cell[data-x="${fx.from.x}"][data-y="${fx.from.y}"]`);
        const to = gridEl.querySelector(`.cell[data-x="${fx.to.x}"][data-y="${fx.to.y}"]`);
        if (!from || !to) continue;
        const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
        const ball = document.createElement('div');
        ball.className = 'cannonball';
        ball.textContent = '💣';
        ball.style.left = `${a.left + a.width / 2 - 12}px`;
        ball.style.top = `${a.top + a.height / 2 - 12}px`;
        document.body.appendChild(ball);
        setTimeout(() => {
          ball.style.left = `${b.left + b.width / 2 - 12}px`;
          ball.style.top = `${b.top + b.height / 2 - 32}px`;
        }, 16);
        setTimeout(() => { ball.textContent = '💥'; ball.classList.add('splash'); }, 400);
        setTimeout(() => ball.remove(), 800);
        continue;
      }
      if (fx.type === 'eruption') {
        const groundBoard = document.querySelector('.ground-map .battlefield');
        if (groundBoard) {
          groundBoard.classList.add('quake');
          setTimeout(() => groundBoard.classList.remove('quake'), 650);
        }
        for (const c of fx.cells || []) {
          const cell = gridEl.querySelector(`.cell[data-x="${c.x}"][data-y="${c.y}"]`);
          if (!cell) continue;
          const r = cell.getBoundingClientRect();
          const lava = document.createElement('span');
          lava.className = 'eruption-fx';
          lava.textContent = '🌋';
          lava.style.left = `${r.left + r.width / 2 - 15}px`;
          lava.style.top = `${r.top + r.height / 2 - 20}px`;
          document.body.appendChild(lava);
          setTimeout(() => lava.remove(), 1000);
        }
        continue;
      }
      if (fx.type === 'dragon-pickup') {
        const cell = gridEl.querySelector(`.cell[data-x="${fx.x}"][data-y="${fx.y}"]`);
        if (!cell) continue;
        const r = cell.getBoundingClientRect();
        const dragon = document.createElement('span');
        dragon.className = 'eruption-fx';
        dragon.textContent = '🐉';
        dragon.style.left = `${r.left + r.width / 2 - 15}px`;
        dragon.style.top = `${r.top + r.height / 2 - 20}px`;
        document.body.appendChild(dragon);
        setTimeout(() => dragon.remove(), 1000);
        continue;
      }
      if (fx.type === 'layer-move' && fx.attack) {
        const fromBoard = fx.from.layer === 'sky' ? skyGridEl : gridEl;
        const toBoard = fx.to.layer === 'sky' ? skyGridEl : gridEl;
        const from = fromBoard && fromBoard.querySelector(`.cell[data-x="${fx.from.x}"][data-y="${fx.from.y}"]`);
        const to = toBoard && toBoard.querySelector(`.cell[data-x="${fx.to.x}"][data-y="${fx.to.y}"]`);
        if (!from || !to) continue;
        const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
        const dragon = document.createElement('div');
        dragon.className = 'cannonball';
        dragon.textContent = `🐉${fx.unitType || ''}`;
        dragon.style.left = `${a.left + a.width / 2 - 18}px`;
        dragon.style.top = `${a.top + a.height / 2 - 14}px`;
        document.body.appendChild(dragon);
        setTimeout(() => {
          dragon.style.left = `${b.left + b.width / 2 - 18}px`;
          dragon.style.top = `${b.top + b.height / 2 - 14}px`;
        }, 16);
        setTimeout(() => { dragon.textContent = '💥'; dragon.classList.add('splash'); }, 360);
        setTimeout(() => dragon.remove(), 780);
      }
    }
  }

  window.addEventListener('resize', () => {
    if (view && view.mode === 'snow') initSnowEffect(true);
  });
})();
