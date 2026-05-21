# Lucifer Bot

Facebook Messenger userbot ("Lucifer Bot") built with @dongdev/fca-unofficial, with an Express/Socket.io dashboard.

## Run & Operate

- `pnpm --filter @workspace/fb-messenger-bot run start` — run the bot + dashboard (port 5000)
- Workflow: **Lucifer Bot Dashboard** — auto-starts the bot via `sh start.sh`
- Dashboard URL: `http://0.0.0.0:5000` (upload cookies here to authenticate)

## Stack

- pnpm workspaces, Node.js 24, CommonJS
- Bot engine: `@dongdev/fca-unofficial` v4
- Database: `better-sqlite3` (SQLite)
- Dashboard: Express 4 + Socket.io 4
- Image generation: `canvas`
- Scheduling: `node-cron`

## Where things live

- `bot/src/index.js` — main entry: loads config, commands, starts dashboard, calls `startBot()`
- `bot/src/commands/` — command modules (Arabic + English filenames), loaded by `loader.js`
- `bot/src/dashboard/server.js` — Express/Socket.io dashboard on port `config.dashboardPort` (default 5000)
- `bot/src/utils/database.js` — SQLite helpers via better-sqlite3 (`User`, `Thread`, `Banned` tables)
- `bot/src/utils/imageGen.js` — canvas-based profile card generation
- `bot/src/protection/` — stealth, keepAlive, MQTT health check, cookie rotator
- `bot/scripts/patch-fca.js` — postinstall patch for `@dongdev/fca-unofficial` dist bundle
- `bot/data/account.txt` — Facebook cookies (JSON array); upload via dashboard
- `bot/data/config.json` — bot config (prefix, ownerID, dashboardPassword, etc.)

## Architecture decisions

- `api.getUserInfo` is callback-based (not promise-based): all calls must be wrapped as `new Promise((res, rej) => api.getUserInfo(id, (e, d) => e ? rej(e) : res(d || {})))`.
- `database.js` Thread.count() uses raw `?` placeholders — values must NOT be converted to strings via template literals.
- `setcookies.js` uses `global.reLoginBot()` for hot-swap (not `require("../index").startBot`) and sets `global._selfWrite = true` as the internal-write guard flag.
- The bot stays alive even with no cookies because the Express server keeps the Node event loop open; `startBot()` just returns early and emits `bot-status: offline`.
- Native modules (`better-sqlite3`, `canvas`, `sqlite3`) are approved in `pnpm-workspace.yaml` under `onlyBuiltDependencies`.

## Product

- Facebook Messenger userbot with 134+ commands (Arabic + English)
- Web dashboard for uploading cookies, monitoring bot status, and configuration
- Economy system (coins, XP, daily rewards, transfers)
- Protection systems: stealth mode, MQTT health check, keep-alive, cookie rotation
- Profile cards with canvas image generation
- Group management: admin commands, ban/unban, kick, broadcast

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **Always wrap `api.getUserInfo` in a Promise** — it's callback-based, not async.
- **Never use template literals for SQL `params.push`** in `database.js` — push the raw value.
- **`global._selfWrite`** is the flag to prevent file-watcher hot-swap on internal cookie writes (NOT `_dashboardWrite`).
- **`sendMessage` signature**: `api.sendMessage(body, threadID, callback, messageID)` — messageID is the 4th arg.
- `start.sh` searches for `libuuid.so.1` via `find /nix/store` which can be slow on first run.
- Run `pnpm --filter @workspace/fb-messenger-bot install` after cloning — postinstall patches the FCA dist bundle.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
