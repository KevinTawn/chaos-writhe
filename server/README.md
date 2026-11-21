# 混乱与蠕动 · 游戏服务器部署包

版本：2.1.0

## 目录

```text
server/        Node 游戏服务器、认证适配、在线统计
shared/        共享规则引擎与常量
package.json   只包含 ws 依赖
.env.example   环境变量模板
```

## 启动

```bash
npm install
# 复制 .env.example 为 .env（Node 本身不自动读取 .env，请用你的进程管理器注入）
AUTH_MODE=dev node server/server.js
```

生产建议用 systemd / pm2 / Docker 注入环境变量：

```bash
AUTH_MODE=ticket \
AUTH_CENTER_URL=https://your-site.example.com \
AUTH_INTROSPECT_PATH=/api/game/introspect \
GAME_TICKET_SECRET=... \
PORT=3000 \
node server/server.js
```

## 认证链路

```text
EXE / 浏览器
  → 统一认证中心登录
  → Bearer Token（EXE）或 HttpOnly Cookie（浏览器）
  → POST /api/auth/ticket
  → 游戏服校验身份并签发一次性 HMAC Ticket
  → WebSocket /?ticket=...
```

登录中心信息未定之前可先用 `AUTH_MODE=dev` 做联调；生产必须使用 `AUTH_MODE=ticket` 并配置 `GAME_TICKET_SECRET`。

## 接口

- `GET /health`：健康检查
- `GET /api/online`：在线人数快照（网站主页读取）
- `GET /api/auth/config`：认证模式
- `GET /api/auth/me`：当前身份（需要 Bearer/Cookie）
- `POST /api/auth/ticket`：换取一次性 Ticket
- `WS /`：对局 WebSocket，生产需要 `?ticket=`

在线日志写入 `logs/online-YYYY-MM-DD.jsonl`，快照写入 `runtime/online.json`，网站后端可直接读取 `/api/online` 或该文件。

## 反向代理

- 静态客户端与媒体不要经过本进程：放 CDN / 对象存储 / 网站静态目录。
- 只反代 `/api/*` 与 WebSocket 到本进程。
- HTTPS 下 WebSocket 必须使用 `wss://`。
- 多实例部署时，一次性 Ticket 和非匿名在线统计需改为 Redis 原子存储。

## 与网站的关系

网站后端负责登录、用户表、下载页和在线人数展示；游戏服务器只做对局。
网站后端可通过 `GET http://game-server:3000/api/online` 获取人数，或读取共享的 `runtime/online.json`。
