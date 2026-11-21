'use strict';
/**
 * 混乱与蠕动 · 本地联机服务器
 * - 静态文件：客户端 / 共享常量 / 单机版
 * - WebSocket：房间、就绪、指令、权威状态、隐藏信息过滤、断线重连
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { WebSocketServer, WebSocket } = require('ws');
const { createGameEngine, MODES } = require('../shared/gameEngine.js');
const { createAuth } = require('./auth.js');
const { createOnlineStats } = require('./online-stats.js');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = path.resolve(__dirname, '..');
const CLIENT_DIR = path.join(ROOT, 'client');
const SHARED_DIR = path.join(ROOT, 'shared');

const ROOM_IDLE_MS = 30 * 60 * 1000;       // 未开始 / 双方离线后的保留时间
const ROOM_FINISHED_IDLE_MS = 10 * 60 * 1000;
const ROOM_ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MODE_SET = new Set(MODES);
const DEV_DEBUG = process.env.DEV_DEBUG === '1';
const AUTH = createAuth(process.env);
const API_CORS_ORIGIN = process.env.API_CORS_ORIGIN || '';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// ────────────────────────────────────────────────────────────────────────────
// 静态文件
// ────────────────────────────────────────────────────────────────────────────
function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('404 Not Found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

// ────────────────────────────────────────────────────────────────────────────
// API 工具
// ────────────────────────────────────────────────────────────────────────────
function setApiHeaders(res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (API_CORS_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', API_CORS_ORIGIN);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
}
function sendJson(res, status, data) {
  setApiHeaders(res);
  res.writeHead(status);
  res.end(JSON.stringify(data));
}
function readJsonBody(req, limit = 8192) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) { reject(Object.assign(new Error('请求体过大'), { status: 413 })); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(Object.assign(new Error('JSON 格式错误'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}
async function handleApi(req, res, pathname) {
  if (req.method === 'OPTIONS') {
    setApiHeaders(res);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.writeHead(204); return res.end();
  }
  if (pathname === '/api/online' && req.method === 'GET') {
    return sendJson(res, 200, { ...ONLINE_STATS.get(), updatedAt: new Date().toISOString() });
  }
  if (pathname === '/api/auth/config' && req.method === 'GET') {
    return sendJson(res, 200, AUTH.config);
  }
  if (pathname === '/api/auth/me' && req.method === 'GET') {
    try {
      const user = await AUTH.identify(req);
      return sendJson(res, 200, { user_id: user.id, username: user.name, is_member: !!user.isMember, mode: AUTH.mode });
    } catch (error) {
      return sendJson(res, error.status || 401, { detail: error.message || '未登录' });
    }
  }
  if (pathname === '/api/auth/ticket' && req.method === 'POST') {
    try {
      // 允许请求体为空；身份只来自 Bearer / HttpOnly Cookie，绝不信任客户端传入的 user_id。
      await readJsonBody(req).catch(() => ({}));
      const user = await AUTH.identify(req);
      const issued = AUTH.issueTicket(user);
      return sendJson(res, 200, {
        ticket: issued.ticket,
        expiresAt: issued.expiresAt,
        user: issued.user,
        mode: AUTH.mode
      });
    } catch (error) {
      return sendJson(res, error.status || 401, { detail: error.message || '无法签发游戏 Ticket' });
    }
  }
  return false;
}

const httpServer = http.createServer((req, res) => {
  let pathname;
  try {
    const url = new URL(req.url, 'http://localhost');
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('400 Bad Request');
  }

  if (pathname.startsWith('/api/')) {
    handleApi(req, res, pathname).then((handled) => {
      if (handled === false) sendJson(res, 404, { detail: 'API 不存在' });
    }).catch((error) => {
      if (!res.headersSent) sendJson(res, error.status || 500, { detail: error.message || '服务器错误' });
    });
    return;
  }
  if (pathname === '/' || pathname === '/index.html') return sendFile(res, path.join(CLIENT_DIR, 'index.html'));
  if (pathname === '/local' || pathname === '/local.html') return sendFile(res, path.join(CLIENT_DIR, 'local', 'index.html'));
  if (pathname === '/rules' || pathname === '/rules.html') return sendFile(res, path.join(CLIENT_DIR, 'rules.html'));
  if (pathname === '/codex' || pathname === '/codex.html') return sendFile(res, path.join(CLIENT_DIR, 'codex.html'));
  if (pathname === '/copyright' || pathname === '/copyright.html') return sendFile(res, path.join(CLIENT_DIR, 'copyright.html'));
  if (pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
  if (pathname === '/health') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ ok: true, rooms: rooms.size, online: ONLINE_STATS.get().online })); }

  if (pathname.startsWith('/shared/')) {
    const target = path.resolve(SHARED_DIR, pathname.slice('/shared/'.length));
    if (!target.startsWith(SHARED_DIR + path.sep) && target !== SHARED_DIR) return res.writeHead(403).end();
    return sendFile(res, target);
  }
  if (pathname.startsWith('/client/')) {
    const target = path.resolve(CLIENT_DIR, pathname.slice('/client/'.length));
    if (!target.startsWith(CLIENT_DIR + path.sep) && target !== CLIENT_DIR) return res.writeHead(403).end();
    return sendFile(res, target);
  }
  // 兼容直接引用 client 下的静态资源
  const bare = path.resolve(CLIENT_DIR, pathname.replace(/^\/+/, ''));
  if (bare.startsWith(CLIENT_DIR + path.sep) && fs.existsSync(bare) && fs.statSync(bare).isFile()) return sendFile(res, bare);

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
});

// ────────────────────────────────────────────────────────────────────────────
// 房间管理
// ────────────────────────────────────────────────────────────────────────────
/** @type {Map<string, Room>} */
const rooms = new Map();
const ONLINE_STATS = createOnlineStats({ getRooms: () => rooms });
ONLINE_STATS.start();
let roomSerial = 0;

function makeRoomId() {
  for (let attempt = 0; attempt < 100; attempt++) {
    let id = '';
    for (let i = 0; i < 6; i++) id += ROOM_ID_ALPHABET[crypto.randomInt(ROOM_ID_ALPHABET.length)];
    if (!rooms.has(id)) return id;
  }
  return 'R' + (++roomSerial).toString(36).toUpperCase().padStart(5, '0');
}

function makePlayer() {
  return { token: crypto.randomUUID(), socket: null, ready: false, connected: false, joinedAt: Date.now() };
}

function createRoom(mode) {
  const id = makeRoomId();
  const room = {
    id,
    mode: MODE_SET.has(mode) ? mode : 'classic',
    players: { red: makePlayer(), blue: makePlayer() },
    redJoined: true, blueJoined: false,
    started: false,
    gameOver: false,
    rematch: { red: false, blue: false },
    engine: null,
    hostToken: '',
    createdAt: Date.now(),
    destroyTimer: null,
    broadcastQueued: false
  };
  room.hostToken = room.players.red.token;
  rooms.set(id, room);
  scheduleRoomCleanup(room);
  return room;
}

function scheduleRoomCleanup(room) {
  if (room.destroyTimer) clearTimeout(room.destroyTimer);
  const bothOffline = !room.players.red.connected && (!room.blueJoined || !room.players.blue.connected);
  if (!bothOffline) { room.destroyTimer = null; return; }
  const delay = room.gameOver ? ROOM_FINISHED_IDLE_MS : ROOM_IDLE_MS;
  room.destroyTimer = setTimeout(() => {
    if (!room.players.red.connected && (!room.blueJoined || !room.players.blue.connected)) destroyRoom(room, '房间长时间无人，已关闭');
  }, delay);
  room.destroyTimer.unref?.();
}

function destroyRoom(room, reason) {
  if (room.destroyTimer) { clearTimeout(room.destroyTimer); room.destroyTimer = null; }
  room.engine?.dispose();
  room.engine = null;
  broadcast(room, { type: 'room_closed', roomId: room.id, reason: reason || '房间已关闭' });
  rooms.delete(room.id);
}

function playerSideOf(room, ws) {
  if (room.players.red.socket === ws) return 'red';
  if (room.players.blue.socket === ws) return 'blue';
  return null;
}

function opponentConnected(room, side) {
  const other = side === 'red' ? 'blue' : 'red';
  if (other === 'blue' && !room.blueJoined) return false;
  const sock = room.players[other].socket;
  return !!sock && sock.readyState === WebSocket.OPEN;
}

function roomMeta(room) {
  return {
    roomId: room.id,
    mode: room.mode,
    started: room.started,
    gameOver: room.gameOver,
    rematch: { red: !!(room.rematch && room.rematch.red), blue: !!(room.rematch && room.rematch.blue) },
    players: {
      red: { joined: room.redJoined, ready: room.players.red.ready, connected: !!room.players.red.socket },
      blue: { joined: room.blueJoined, ready: room.players.blue.ready, connected: !!room.players.blue.socket }
    }
  };
}

function broadcast(room, message, onlySide) {
  const data = JSON.stringify(message);
  const sides = onlySide ? [onlySide] : ['red', 'blue'];
  for (const side of sides) {
    if (side === 'blue' && !room.blueJoined) continue;
    const sock = room.players[side].socket;
    if (sock && sock.readyState === WebSocket.OPEN) {
      try { sock.send(data); } catch (error) { console.error('[send]', error.message); }
    }
  }
}

function queueStateBroadcast(room, delay = 0) {
  if (room.broadcastQueued) return;
  room.broadcastQueued = true;
  setTimeout(() => {
    room.broadcastQueued = false;
    sendState(room);
  }, delay);
}

function sendState(room) {
  if (!room.engine || !room.started) return;
  try {
    const views = {};
    for (const side of ['red', 'blue']) {
      if (side === 'blue' && !room.blueJoined) continue;
      views[side] = room.engine.getView(side);
    }
    const fx = room.engine.takeFx();
    room.gameOver = !!room.engine.gameOver;
    for (const side of Object.keys(views)) {
      broadcast(room, {
        type: 'state',
        you: side,
        roomId: room.id,
        view: views[side],
        opponentConnected: opponentConnected(room, side),
        fx
      }, side);
    }
  } catch (error) {
    console.error('[state]', error.stack || error);
  }
}

function startGame(room) {
  if (!room.started) {
    room.engine = createGameEngine({ onUpdate: () => queueStateBroadcast(room) });
    room.started = true;
    room.gameOver = false;
  }
  room.rematch = { red: false, blue: false };
  room.engine.startGame(room.mode);
  broadcast(room, { type: 'room', room: roomMeta(room) });
  sendState(room);
}

// 再来一局：双方都确认后交换红蓝席位，并沿用原模式重新开局。
function restartRematch(room) {
  if (room.destroyTimer) { clearTimeout(room.destroyTimer); room.destroyTimer = null; }
  room.engine?.dispose();
  room.engine = null;
  const oldRed = room.players.red;
  room.players.red = room.players.blue;
  room.players.blue = oldRed;
  room.players.red.ready = true;
  room.players.blue.ready = true;
  room.started = false;
  room.gameOver = false;
  for (const side of ['red', 'blue']) {
    const player = room.players[side];
    if (player.socket) {
      player.socket.roomId = room.id;
      player.socket.side = side;
    }
  }
  const meta = roomMeta(room);
  for (const side of ['red', 'blue']) {
    const player = room.players[side];
    if (player.socket) send(player.socket, { type: 'joined', you: side, token: player.token, room: meta, mode: room.mode });
  }
  startGame(room);
}

// ────────────────────────────────────────────────────────────────────────────
// WebSocket
// ────────────────────────────────────────────────────────────────────────────
const wss = new WebSocketServer({
  server: httpServer,
  maxPayload: 64 * 1024,
  verifyClient: (info, done) => {
    try {
      const url = new URL(info.req.url, 'http://localhost');
      const ticket = url.searchParams.get('ticket') || '';
      const result = AUTH.verifyTicket(ticket);
      if (!result.ok && AUTH.required) {
        info.req.authFailure = result.reason || 'unauthorized';
        return done(false, 401, 'Unauthorized');
      }
      info.req.user = result.ok ? result.user : { id: 'anon-' + crypto.randomUUID(), name: '访客' };
      done(true);
    } catch (error) {
      done(false, 401, 'Unauthorized');
    }
  }
});

wss.on('connection', (ws, req) => {
  ws.user = (req && req.user) || { id: 'anon-' + crypto.randomUUID(), name: '访客' };
  ONLINE_STATS.attach(ws, ws.user);
  ws.isAlive = true;
  ws.roomId = null;
  ws.side = null;
  ws.msgWindow = 0;
  ws.msgWindowStart = Date.now();

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    const now = Date.now();
    if (now - ws.msgWindowStart > 1000) { ws.msgWindowStart = now; ws.msgWindow = 0; }
    if (++ws.msgWindow > 40) return ws.send(JSON.stringify({ type: 'error', message: '操作过于频繁' }));

    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return sendError(ws, '无效的消息格式'); }
    if (!msg || typeof msg.type !== 'string') return sendError(ws, '缺少消息类型');

    try { handleMessage(ws, msg); }
    catch (error) {
      console.error('[ws]', error.stack || error);
      sendError(ws, '服务器处理失败：' + error.message);
    }
  });

  ws.on('close', () => { ONLINE_STATS.detach(ws); handleDisconnect(ws); });
  ws.on('error', () => { ONLINE_STATS.detach(ws); handleDisconnect(ws); });
});

function sendError(ws, message) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'error', message }));
}

function send(ws, message) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
}

function currentRoom(ws) {
  if (!ws.roomId) return null;
  const room = rooms.get(ws.roomId);
  if (!room) return null;
  const side = playerSideOf(room, ws);
  if (!side) return null;
  return { room, side };
}

function detachFromRoom(ws) {
  const found = currentRoom(ws);
  if (!found) return;
  const { room, side } = found;
  room.players[side].socket = null;
  room.players[side].connected = false;
  ws.roomId = null; ws.side = null;
  broadcast(room, { type: 'room', room: roomMeta(room) });
  if (room.started) queueStateBroadcast(room);
  scheduleRoomCleanup(room);
}

function handleDisconnect(ws) {
  const found = currentRoom(ws);
  if (!found) return;
  const { room, side } = found;
  room.players[side].socket = null;
  room.players[side].connected = false;
  ws.roomId = null; ws.side = null;
  broadcast(room, { type: 'room', room: roomMeta(room) });
  if (room.started) queueStateBroadcast(room);
  scheduleRoomCleanup(room);
}

function bindPlayer(ws, room, side, token) {
  const player = room.players[side];
  player.token = token; // 首次创建时保持；重连时匹配
  player.socket = ws;
  player.connected = true;
  player.userId = ws.user ? ws.user.id : null;
  player.userName = ws.user ? ws.user.name : null;
  ws.roomId = room.id;
  ws.side = side;
  if (room.destroyTimer) { clearTimeout(room.destroyTimer); room.destroyTimer = null; }
  send(ws, {
    type: 'joined',
    you: side,
    token: player.token,
    room: roomMeta(room),
    mode: room.mode
  });
  broadcast(room, { type: 'room', room: roomMeta(room) });
  if (room.started) {
    sendState(room);
    queueStateBroadcast(room);
  }
}

function handleMessage(ws, msg) {
  switch (msg.type) {
    case 'create_room': {
      detachFromRoom(ws);
      const room = createRoom(msg.mode);
      bindPlayer(ws, room, 'red', room.players.red.token);
      return;
    }
    case 'join_room': {
      const roomId = String(msg.roomId || '').trim().toUpperCase();
      const room = rooms.get(roomId);
      if (!room) return sendError(ws, '房间不存在或已关闭');
      // 带 token 时，允许重新绑定自己的席位（含房主/红方、蓝方、对局进行中）
      if (msg.token) {
        const token = String(msg.token);
        let tokenSide = null;
        if (token === room.players.red.token) tokenSide = 'red';
        else if (room.blueJoined && token === room.players.blue.token) tokenSide = 'blue';
        if (tokenSide) {
          detachFromRoom(ws);
          bindPlayer(ws, room, tokenSide, token);
          return;
        }
      }
      if (room.blueJoined) return sendError(ws, '房间已满（若你之前离开过，请点击「回到之前的房间」）');
      if (room.started) return sendError(ws, '对局已经开始');
      detachFromRoom(ws);
      room.blueJoined = true;
      room.players.blue = makePlayer();
      bindPlayer(ws, room, 'blue', room.players.blue.token);
      return;
    }
    case 'rejoin': {
      const roomId = String(msg.roomId || '').trim().toUpperCase();
      const token = String(msg.token || '');
      const room = rooms.get(roomId);
      if (!room) return send(ws, { type: 'rejoin_failed', roomId, reason: '房间已关闭' });
      let side = null;
      if (token && token === room.players.red.token) side = 'red';
      else if (room.blueJoined && token && token === room.players.blue.token) side = 'blue';
      if (!side) return send(ws, { type: 'rejoin_failed', roomId, reason: '身份已失效' });
      detachFromRoom(ws);
      bindPlayer(ws, room, side, token);
      return;
    }
    case 'set_mode': {
      const found = currentRoom(ws);
      if (!found) return sendError(ws, '不在房间中');
      const { room, side } = found;
      if (side !== 'red') return sendError(ws, '只有房主可以选择模式');
      if (room.started) return sendError(ws, '对局已经开始');
      if (!MODE_SET.has(msg.mode)) return sendError(ws, '未知模式');
      room.mode = msg.mode;
      broadcast(room, { type: 'room', room: roomMeta(room) });
      return;
    }
    case 'ready': {
      const found = currentRoom(ws);
      if (!found) return sendError(ws, '不在房间中');
      const { room, side } = found;
      if (room.started) return sendError(ws, '对局已经开始');
      room.players[side].ready = msg.ready !== false;
      broadcast(room, { type: 'room', room: roomMeta(room) });
      if (room.players.red.ready && room.blueJoined && room.players.blue.ready) startGame(room);
      return;
    }
    case 'leave': {
      const found = currentRoom(ws);
      if (!found) return;
      const { room, side } = found;
      detachFromRoom(ws);
      send(ws, { type: 'left' });
      if (room.started || room.gameOver) {
        // 对局中离开：对手保留房间等待重连，超时销毁。
        queueStateBroadcast(room);
      }
      return;
    }
    case 'rematch': {
      const found = currentRoom(ws);
      if (!found) return sendError(ws, '不在房间中');
      const { room, side } = found;
      if (!room.started || !room.gameOver) return sendError(ws, '对局尚未结束');
      if (!opponentConnected(room, side)) return sendError(ws, '对手已离开，无法再来一局');
      room.rematch = room.rematch || { red: false, blue: false };
      room.rematch[side] = true;
      broadcast(room, { type: 'room', room: roomMeta(room) });
      if (room.rematch.red && room.rematch.blue) restartRematch(room);
      return;
    }
    case 'cmd': {
      const found = currentRoom(ws);
      if (!found) return sendError(ws, '不在房间中');
      const { room, side } = found;
      if (!room.started || !room.engine) return sendError(ws, '对局尚未开始');
      const result = dispatchCommand(room.engine, side, msg.command || {});
      if (result && result.ok === false) sendError(ws, result.error || '操作不合法');
      return;
    }
    default:
      return sendError(ws, '未知消息类型：' + msg.type);
  }
}

function dispatchCommand(engine, side, command) {
  // 仅开发调试：DEV_DEBUG=1 时允许发牌，用于自动化测试；正常启动不生效。
  if (DEV_DEBUG && command.type === 'dev_add_card') {
    engine.debug.addCard(side, Number(command.cardId));
    return { ok: true };
  }
  if (DEV_DEBUG && command.type === 'dev_spawn_unit') {
    engine.debug.spawnUnit(command.side || side, String(command.unitType), Number(command.x), Number(command.y));
    return { ok: true };
  }
  if (DEV_DEBUG && command.type === 'dev_spawn_mine_unit') {
    engine.debug.spawnMineUnit(command.side || side, String(command.unitType), Number(command.x), Number(command.y));
    return { ok: true };
  }
  if (DEV_DEBUG && command.type === 'dev_clear_mine_units') {
    engine.debug.clearMineUnits();
    return { ok: true };
  }
  if (DEV_DEBUG && command.type === 'dev_spawn_sky_unit') {
    engine.debug.spawnSkyUnit(command.side || side, String(command.unitType), Number(command.x), Number(command.y), Number(command.power) || 3);
    return { ok: true };
  }
  if (DEV_DEBUG && command.type === 'dev_spawn_armory_unit') {
    const unit = engine.debug.spawnArmoryUnit(command.side || side, String(command.armoryType), Number(command.x), Number(command.y));
    return unit ? { ok: true } : { ok: false, error: '无法生成军火库单位' };
  }
  if (DEV_DEBUG && command.type === 'dev_fog_state') {
    engine.debug.setFogNight(!!command.night);
    return { ok: true };
  }
  if (DEV_DEBUG && command.type === 'dev_holy_warning') {
    engine.debug.holyWarning();
    return { ok: true };
  }
  switch (command.type) {
    case 'armory_choose': return engine.armoryChooseFor(side, command.unit === undefined ? null : command.unit);
    case 'deploy': return engine.deployFor(side, command.unitType, command.x, command.y);
    case 'remove': return engine.removeFor(side, command.x, command.y);
    case 'finish_deploy': return engine.finishDeployFor(side);
    case 'click': return engine.clickFor(side, command.x, command.y, command.layer);
    case 'ascend': return engine.ascendFor(side);
    case 'dive': return engine.diveFor(side);
    case 'end_turn': return engine.endTurnFor(side);
    case 'wannan_incident': return engine.wannanIncidentChoiceFor(side, !!command.accept);
    case 'tide_mode': return engine.tideModeFor(side, command.mode === 'purge' || command.mode === 'mark' ? command.mode : null);
    case 'surrender': return engine.surrenderFor(side);
    case 'draw_open': return engine.drawOpenFor(side);
    case 'draw_pick': return engine.drawPickFor(side, command.cardId);
    case 'draw_cancel': return engine.drawCancelFor(side);
    case 'draw_reroll': return engine.drawRerollFor(side);
    case 'use_card_enter': return engine.useCardFor(side, !!command.doubleCard);
    case 'select_card': return engine.selectCardFor(side, command.cardId);
    case 'play_card': return engine.playCardFor(side);
    case 'start_action': return engine.startActionFor(side);
    case 'cancel': return engine.cancelFor(side);
    case 'finish_target': return engine.finishTargetFor(side);
    case 'cancel_target': return engine.cancelTargetFor(side);
    case 'reveal': return engine.revealForPlayer(side, command.kind);
    default: return { ok: false, error: '未知指令：' + command.type };
  }
}

// 心跳，用于清理半开连接
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) { ws.terminate(); continue; }
    ws.isAlive = false;
    try { ws.ping(); } catch { /* ignore */ }
  }
}, 30000);
heartbeat.unref?.();

httpServer.listen(PORT, () => {
  console.log(`混乱与蠕动 · 联机服务器已启动`);
  console.log(`  本机访问：http://localhost:${PORT}`);
  console.log(`  单机热座：http://localhost:${PORT}/local`);
  console.log(`  局域网内其他设备：http://<本机内网IP>:${PORT}`);
  if (DEV_DEBUG) console.log('  ⚠ 开发调试指令已启用（DEV_DEBUG=1）');
});

process.on('SIGINT', () => {
  clearInterval(heartbeat);
  for (const room of rooms.values()) room.engine?.dispose();
  wss.close();
  httpServer.close(() => process.exit(0));
});
