'use strict';
/*
 * 游戏服务器认证适配层
 * ---------------------------------------------------------------------------
 * 生产链路（由统一认证中心负责用户表）：
 *   EXE / 浏览器
 *     → 认证中心登录，得到短期 Bearer Token（EXE）或 HttpOnly Cookie（浏览器）
 *     → POST /api/auth/ticket（Bearer 或 Cookie）
 *     → 本模块向认证中心 introspect，拿到 user_id
 *     → 签发一次性 HMAC Ticket
 *     → WebSocket ?ticket=... 握手
 *     → 游戏服务器消费 Ticket，只保留 user_id / username
 *
 * 注意：
 * - Ticket 只用于 WebSocket 握手，不用于后续每条消息。
 * - Ticket 在内存中一次性消费；多实例部署时应换成 Redis 原子消费。
 * - 认证中心的具体地址、路径由环境变量配置，登录信息确定后只需改环境变量。
 */
const crypto = require('crypto');

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}
function fromB64url(input) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function createAuth(env = process.env) {
  const mode = String(env.AUTH_MODE || (env.NODE_ENV === 'production' ? 'ticket' : 'dev')).toLowerCase();
  const devOpen = mode === 'dev' && env.AUTH_DEV_OPEN !== '0';
  const ticketSecret = env.GAME_TICKET_SECRET || (devOpen ? 'dev-only-change-me' : '');
  const ticketTtlMs = Math.max(10, Number(env.GAME_TICKET_TTL_SECONDS) || 60) * 1000;
  const authCenter = String(env.AUTH_CENTER_URL || '').replace(/\/+$/, '');
  const introspectPath = env.AUTH_INTROSPECT_PATH || '/api/game/introspect';
  const mePath = env.AUTH_ME_PATH || '/api/me';
  const used = new Map(); // nonce -> expiresAt
  let nextCleanup = Date.now() + 60000;

  if (!devOpen && !ticketSecret) {
    throw new Error('GAME_TICKET_SECRET 未配置：生产环境必须配置一次性 Ticket 密钥');
  }

  function cleanup() {
    const now = Date.now();
    if (now < nextCleanup) return;
    nextCleanup = now + 60000;
    for (const [nonce, exp] of used) if (exp <= now) used.delete(nonce);
  }

  function issueTicket(user) {
    const now = Date.now();
    const payload = {
      uid: String(user.id),
      name: String(user.name || user.username || user.id),
      iat: now,
      exp: now + ticketTtlMs,
      nonce: crypto.randomUUID()
    };
    const body = b64url(JSON.stringify(payload));
    const sig = crypto.createHmac('sha256', ticketSecret).update(body).digest('base64url');
    return { ticket: body + '.' + sig, expiresAt: payload.exp, user: { id: payload.uid, name: payload.name } };
  }

  function verifyTicket(ticket) {
    cleanup();
    if (!ticket || typeof ticket !== 'string' || !ticket.includes('.')) return { ok: false, reason: 'missing_ticket' };
    const [body, sig] = ticket.split('.');
    if (!body || !sig) return { ok: false, reason: 'malformed_ticket' };
    const expected = crypto.createHmac('sha256', ticketSecret).update(body).digest('base64url');
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return { ok: false, reason: 'bad_signature' };
    }
    let payload;
    try { payload = JSON.parse(fromB64url(body)); } catch { return { ok: false, reason: 'bad_payload' }; }
    if (!payload || !payload.uid || !payload.exp || !payload.nonce) return { ok: false, reason: 'bad_payload' };
    if (Date.now() > Number(payload.exp)) return { ok: false, reason: 'expired' };
    if (used.has(payload.nonce)) return { ok: false, reason: 'ticket_used' };
    used.set(payload.nonce, Number(payload.exp));
    return { ok: true, user: { id: String(payload.uid), name: String(payload.name || payload.uid) } };
  }

  async function introspectBearer(token) {
    if (!authCenter) throw Object.assign(new Error('AUTH_CENTER_URL 未配置'), { status: 503 });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(authCenter + introspectPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ token }),
        signal: controller.signal
      });
      if (!res.ok) throw Object.assign(new Error('认证中心拒绝 Token'), { status: 401 });
      const data = await res.json();
      const id = data.user_id ?? data.userId ?? data.id ?? (data.user && (data.user.id ?? data.user.user_id));
      if (!id) throw Object.assign(new Error('认证中心没有返回 user_id'), { status: 502 });
      return { id: String(id), name: String(data.username || data.name || (data.user && data.user.username) || id), isMember: !!(data.is_member || data.isMember) };
    } finally { clearTimeout(timer); }
  }

  async function introspectCookie(cookie) {
    if (!authCenter) throw Object.assign(new Error('AUTH_CENTER_URL 未配置'), { status: 503 });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(authCenter + mePath, {
        method: 'GET',
        headers: { Cookie: cookie },
        signal: controller.signal
      });
      if (!res.ok) throw Object.assign(new Error('认证中心 Cookie 无效'), { status: 401 });
      const data = await res.json();
      const id = data.user_id ?? data.userId ?? data.id ?? (data.user && (data.user.id ?? data.user.user_id));
      if (!id) throw Object.assign(new Error('认证中心没有返回 user_id'), { status: 502 });
      return { id: String(id), name: String(data.username || data.name || id), isMember: !!(data.is_member || data.isMember) };
    } finally { clearTimeout(timer); }
  }

  async function identify(req) {
    if (devOpen) {
      const name = env.AUTH_DEV_USER || '本地玩家';
      return { id: 'dev-' + name, name, isMember: false, dev: true };
    }
    const header = req.headers.authorization || '';
    if (header.startsWith('Bearer ')) return introspectBearer(header.slice(7).trim());
    const cookie = req.headers.cookie || '';
    if (cookie) return introspectCookie(cookie);
    throw Object.assign(new Error('未登录：需要 Bearer Token 或 HttpOnly Cookie'), { status: 401 });
  }

  return {
    mode,
    devOpen,
    required: !devOpen,
    issueTicket,
    verifyTicket,
    identify,
    config: {
      mode,
      ticketTtlSeconds: Math.floor(ticketTtlMs / 1000),
      loginUrl: env.AUTH_LOGIN_URL || '/login'
    }
  };
}

module.exports = { createAuth };
