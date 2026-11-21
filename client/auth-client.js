'use strict';
/*
 * 混乱与蠕动 · 客户端认证桥接
 * ---------------------------------------------------------------------------
 * EXE 登录流程：
 *   用户名 / 密码
 *     → POST <认证站>/api/auth/login
 *     → 短期 Bearer Token
 *     → 本机游戏服 POST /api/auth/ticket
 *     → 游戏服向 /api/game/introspect 校验
 *     → 一次性 Ticket → WebSocket
 *
 * 登录凭据只发送到站点认证中心，本地游戏服不接触密码。
 */
(function (root) {
  'use strict';
  const cfg = Object.assign({
    apiBase: '',
    gameApiBase: '',
    loginUrl: '/login',
    tokenKey: 'chaos.auth.token.v1',
    refreshKey: 'chaos.auth.refresh.v1',
    userKey: 'chaos.auth.user.v1'
  }, root.CHAOS_AUTH_CONFIG || {});
  const authBase = String(cfg.apiBase || '').replace(/\/+$/, '');
  const gameBase = String(cfg.gameApiBase !== undefined ? cfg.gameApiBase : cfg.apiBase || '').replace(/\/+$/, '');
  const authUrl = (path) => authBase + path;
  const gameUrl = (path) => gameBase + path;
  let listeners = [];

  function read(key) { try { return localStorage.getItem(key) || ''; } catch { return ''; } }
  function write(key, value) { try { if (value) localStorage.setItem(key, value); else localStorage.removeItem(key); } catch {} }
  function jsonRead(key) { try { return JSON.parse(read(key) || 'null'); } catch { return null; } }

  function getToken() { return read(cfg.tokenKey); }
  function getUser() { return jsonRead(cfg.userKey); }
  function isLoggedIn() { return !!(getToken() || getUser()); }

  function normalizeUser(user) {
    if (!user) return null;
    return {
      id: user.user_id || user.userId || user.id || '',
      username: user.username || user.name || user.user_id || user.id || '',
      isMember: !!(user.is_member || user.isMember),
      isAdmin: !!(user.is_admin || user.isAdmin)
    };
  }

  function setSession(token, user) {
    write(cfg.tokenKey, token || '');
    write(cfg.userKey, user ? JSON.stringify(user) : '');
    listeners.forEach((fn) => { try { fn(getState()); } catch {} });
    if (typeof renderStatus === 'function') renderStatus();
  }
  function clearSession() {
    write(cfg.tokenKey, '');
    write(cfg.refreshKey, '');
    write(cfg.userKey, '');
    listeners.forEach((fn) => { try { fn(getState()); } catch {} });
  }

  async function parseResponse(res) {
    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) {
      const error = new Error((data && (data.detail || data.message)) || ('HTTP ' + res.status));
      error.status = res.status;
      throw error;
    }
    return data || {};
  }

  async function request(url, options = {}) {
    const headers = Object.assign({}, options.headers || {});
    const token = getToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    const res = await fetch(url, Object.assign({ credentials: 'include', cache: 'no-store' }, options, { headers }));
    return parseResponse(res);
  }

  async function login(username, password) {
    const name = String(username || '').trim();
    const pass = String(password || '');
    if (!name) throw new Error('请输入用户名');
    if (!pass) throw new Error('请输入密码');
    const data = await request(authUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, password: pass })
    });
    if (!data.access_token) throw new Error('认证中心没有返回 Token');
    setSession(data.access_token, normalizeUser(data.user));
    write(cfg.refreshKey, data.refresh_token || '');
    return getState();
  }

  async function refreshSession() {
    const refresh = read(cfg.refreshKey);
    if (!refresh) throw new Error('登录已过期，请重新登录');
    const data = await request(authUrl('/api/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh })
    });
    if (!data.access_token) throw new Error('刷新登录态失败');
    setSession(data.access_token, normalizeUser(data.user));
    if (data.refresh_token) write(cfg.refreshKey, data.refresh_token);
    return data.access_token;
  }

  async function loginWithToken(token) {
    const clean = String(token || '').trim();
    if (!clean) throw new Error('Token 不能为空');
    write(cfg.tokenKey, clean);
    try {
      const me = await request(authUrl('/api/auth/me'));
      setSession(clean, normalizeUser(me));
      return getState();
    } catch (error) {
      clearSession();
      throw error;
    }
  }

  async function loginWithCookie() {
    try {
      const me = await request(authUrl('/api/auth/me'));
      setSession('', normalizeUser(me));
      return getState();
    } catch (error) {
      clearSession();
      throw error;
    }
  }

  async function issueTicket() {
    const data = await request(gameUrl('/api/auth/ticket'), { method: 'POST' });
    if (!data || !data.ticket) throw new Error('服务器没有返回 Ticket');
    if (data.user) setSession(getToken(), normalizeUser({ id: data.user.id, username: data.user.name }));
    return data;
  }

  async function getTicket() {
    try {
      return await issueTicket();
    } catch (error) {
      if (error && error.status === 401) {
        await refreshSession();
        return issueTicket();
      }
      throw error;
    }
  }

  async function logout() {
    const token = getToken();
    clearSession();
    // 尽量撤销网站侧 Token；失败不影响本地退出。
    if (token) {
      try {
        await fetch(authUrl('/api/auth/logout'), {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token },
          cache: 'no-store'
        });
      } catch {}
    }
    listeners.forEach((fn) => { try { fn(getState()); } catch {} });
  }

  function getState() {
    const user = getUser();
    return {
      loggedIn: isLoggedIn(),
      user,
      label: user ? (user.username || user.id || '已登录') : '登录',
      loginUrl: cfg.loginUrl
    };
  }

  function onChange(fn) {
    if (typeof fn === 'function') listeners.push(fn);
    return () => { listeners = listeners.filter((x) => x !== fn); };
  }

  function openLogin() {
    const modal = document.getElementById('authModal');
    if (!modal) { window.location.href = cfg.loginUrl; return; }
    modal.hidden = false;
    const input = document.getElementById('authUsername');
    if (input) setTimeout(() => input.focus(), 30);
  }
  function closeLogin() {
    const modal = document.getElementById('authModal');
    if (modal) modal.hidden = true;
  }

  function renderStatus() {
    const state = getState();
    const btn = document.getElementById('auth-status-btn');
    if (btn) {
      btn.textContent = state.loggedIn ? '👤 ' + state.label : '登录';
      btn.title = state.loggedIn ? '已登录：' + state.label : '登录 / 绑定账号';
    }
    const label = document.getElementById('authModalUser');
    if (label) label.textContent = state.loggedIn ? '当前账号：' + state.label : '使用网站账号登录';
  }

  function bindUi() {
    const btn = document.getElementById('auth-status-btn');
    if (btn) btn.addEventListener('click', () => { if (isLoggedIn()) logout(); else openLogin(); });
    const close = document.getElementById('authCloseBtn');
    if (close) close.addEventListener('click', closeLogin);

    const form = document.getElementById('authLoginForm');
    const submit = document.getElementById('authLoginBtn');
    const errorBox = document.getElementById('authError');
    if (form) {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = document.getElementById('authUsername');
        const password = document.getElementById('authPassword');
        if (errorBox) { errorBox.textContent = ''; errorBox.hidden = true; }
        if (submit) submit.disabled = true;
        try {
          await login(username ? username.value : '', password ? password.value : '');
          closeLogin();
          renderStatus();
          window.dispatchEvent(new CustomEvent('chaos-auth-changed', { detail: getState() }));
        } catch (error) {
          if (errorBox) {
            errorBox.textContent = error.message || '登录失败';
            errorBox.hidden = false;
          }
        } finally {
          if (submit) submit.disabled = false;
        }
      });
    }

    const toggle = document.getElementById('authPasswordToggle');
    const password = document.getElementById('authPassword');
    if (toggle && password) {
      toggle.addEventListener('click', () => {
        const showing = password.type === 'text';
        password.type = showing ? 'password' : 'text';
        toggle.textContent = showing ? '显示' : '隐藏';
        toggle.setAttribute('aria-label', showing ? '显示密码' : '隐藏密码');
      });
    }
    renderStatus();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindUi);
  else bindUi();

  root.ChaosAuth = Object.freeze({
    config: cfg,
    getToken, getUser, isLoggedIn, getState, onChange,
    login, loginWithToken, loginWithCookie, getTicket, logout,
    refreshSession, openLogin, closeLogin, renderStatus
  });
})(typeof window !== 'undefined' ? window : globalThis);
