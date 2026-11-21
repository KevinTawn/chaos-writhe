'use strict';
/*
 * 在线人数 / 在线日志
 * ---------------------------------------------------------------------------
 * - online：唯一 user_id 数（未登录开发连接按连接计）
 * - inGame：已加入且已开局房间中的唯一 user_id 数
 * - rooms：当前房间数
 * 输出：
 *   GET /api/online
 *   runtime/online.json（原子快照，网站后端可直接读文件）
 *   logs/online-YYYY-MM-DD.jsonl（连接/断开日志）
 *
 * 多实例部署时，网站后端应改为读取 Redis 或各实例汇总接口。
 */
const fs = require('fs');
const path = require('path');

function createOnlineStats(options = {}) {
  const logDir = options.logDir || path.join(__dirname, '..', 'logs');
  const runtimeDir = options.runtimeDir || path.join(__dirname, '..', 'runtime');
  const getRooms = typeof options.getRooms === 'function' ? options.getRooms : () => new Map();
  const sockets = new Map(); // ws -> { userId, name, since }
  const userCounts = new Map();
  let lastSnapshot = null;
  let timer = null;
  let startedAt = Date.now();

  fs.mkdirSync(logDir, { recursive: true });
  fs.mkdirSync(runtimeDir, { recursive: true });

  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function log(event) {
    const line = JSON.stringify(Object.assign({ ts: new Date().toISOString() }, event)) + '\n';
    fs.appendFile(path.join(logDir, 'online-' + today() + '.jsonl'), line, () => {});
  }

  function addCount(userId, delta) {
    const n = (userCounts.get(userId) || 0) + delta;
    if (n <= 0) userCounts.delete(userId); else userCounts.set(userId, n);
  }

  function roomUserIds() {
    const ids = new Set();
    for (const room of getRooms().values()) {
      if (!room || !room.started || room.gameOver) continue;
      for (const side of ['red', 'blue']) {
        const p = room.players && room.players[side];
        if (p && p.connected && p.userId) ids.add(String(p.userId));
      }
    }
    return ids;
  }

  function snapshot() {
    const rooms = getRooms();
    const activeRooms = [...rooms.values()].filter(r => r && (r.started ? !r.gameOver : true)).length;
    const inGame = roomUserIds().size;
    const data = {
      configured: true,
      available: true,
      status: 'online',
      online: userCounts.size,
      connections: sockets.size,
      inGame,
      rooms: activeRooms,
      startedAt,
      updatedAt: new Date().toISOString(),
      source: 'game_ws'
    };
    lastSnapshot = data;
    try {
      const target = path.join(runtimeDir, 'online.json');
      const tmp = target + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
      fs.renameSync(tmp, target);
    } catch (e) { /* 统计不应影响对局 */ }
    return data;
  }

  function attach(ws, user) {
    const u = user || { id: 'anon-' + Math.random().toString(36).slice(2), name: '访客' };
    sockets.set(ws, { userId: String(u.id), name: String(u.name || u.id), since: Date.now() });
    addCount(String(u.id), 1);
    log({ event: 'connect', userId: String(u.id), name: String(u.name || u.id) });
    snapshot();
  }

  function detach(ws) {
    const info = sockets.get(ws);
    if (!info) return;
    sockets.delete(ws);
    addCount(info.userId, -1);
    log({ event: 'disconnect', userId: info.userId, name: info.name, durationMs: Date.now() - info.since });
    snapshot();
  }

  function get() {
    return snapshot();
  }

  function start(intervalMs = 15000) {
    snapshot();
    if (!timer) timer = setInterval(snapshot, intervalMs);
    timer.unref && timer.unref();
  }
  function stop() { if (timer) clearInterval(timer); timer = null; }

  return { attach, detach, get, snapshot, start, stop, logDir, runtimeDir };
}

module.exports = { createOnlineStats };
