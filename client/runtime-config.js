/*
 * 运行时连接配置
 * ---------------------------------------------------------------------------
 * 默认全部留空，按「同源部署」工作：
 *   - WebSocket 连接到当前页面所在主机（online.js 会回退到 location.host）
 *   - 认证请求发往同源的 /api/auth/*
 * 部署到独立站点或独立游戏服时，在本文件之前覆盖 window.CHAOS_RUNTIME_CONFIG，
 * 或直接修改下面的默认值为你自己的域名。
 */
window.CHAOS_RUNTIME_CONFIG = Object.assign({
  gameServer: '',
  authApiBase: '',
  gameApiBase: '',
  loginUrl: '/login'
}, window.CHAOS_RUNTIME_CONFIG || {});

window.CHAOS_AUTH_CONFIG = Object.assign({
  apiBase: window.CHAOS_RUNTIME_CONFIG.authApiBase || '',
  gameApiBase: window.CHAOS_RUNTIME_CONFIG.gameApiBase || '',
  loginUrl: window.CHAOS_RUNTIME_CONFIG.loginUrl || '/login',
  tokenKey: 'chaos.auth.token.v1',
  refreshKey: 'chaos.auth.refresh.v1',
  userKey: 'chaos.auth.user.v1'
}, window.CHAOS_AUTH_CONFIG || {});
