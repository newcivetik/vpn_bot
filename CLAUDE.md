# VPN Bot — Project Guide for Claude Code

## Project Overview

Telegram VPN bot with mini-app, admin panel, and backend. Sells VLESS+Reality VPN subscriptions via Telegram Stars and YooKassa payments.

## Architecture

```
vpn-bot/
├── backend/          # NestJS API + Telegram bot (grammY)
│   ├── src/          # Source code (ONLY edit here)
│   ├── dist/         # Compiled output (DO NOT edit, auto-generated)
│   ├── migrations/   # TypeORM migrations (.ts, NOT compiled by nest build)
│   ├── data-source.ts # TypeORM CLI config (NOT compiled by nest build)
│   └── package.json
├── mini-app/         # React + Vite + Tailwind (Telegram WebApp)
│   ├── src/
│   └── package.json
├── admin/            # React + Vite + Tailwind (admin dashboard)
│   ├── src/
│   └── package.json
├── docker-compose.yml
└── .github/workflows/deploy.yml
```

## Critical Rules

### Build System

- **Entry point**: `backend/dist/main.js` — PM2 runs this on the server
- **NEVER put .ts files in backend root** that aren't excluded from compilation. Files outside `src/` change the `dist/` structure from `dist/main.js` to `dist/src/main.js`, breaking PM2
- `tsconfig.build.json` excludes: `data-source.ts`, `migrations/`, `test/`, `**/*spec.ts`
- If you must add files to backend root, add them to `tsconfig.build.json` `exclude` array
- After ANY backend change, verify: `cd backend && npm run build && ls dist/main.js`

### Environment Variables

Location on server: `/root/vpn_bot/.env` (root level, shared by docker-compose and backend)

**Required variables** (app won't start without these):
- `DB_USERNAME`, `DB_PASSWORD` — Postgres credentials
- `BOT_TOKEN` — Telegram bot token
- `MINI_APP_URL` — Mini-app URL (e.g. https://vpn.sellwhy.ru)
- `XUI_HOST`, `XUI_USERNAME`, `XUI_PASSWORD` — 3X-UI panel credentials
- `ADMIN_PASSWORD` — Admin panel password (min 1 char)
- `JWT_SECRET` — JWT signing key (min 16 chars)

**Optional variables:**
- `WEBHOOK_DOMAIN` — If set, bot uses webhook mode; if empty, uses long polling
- `WEBHOOK_SECRET` — Telegram webhook secret token verification
- `YOKASSA_SHOP_ID`, `YOKASSA_SECRET_KEY` — YooKassa payments (card payments disabled without these)
- `ADMIN_APP_URL` — Admin panel URL for CORS
- `REFERRAL_BONUS_DAYS` — Days bonus for referral (default: 3)

### Database

- **TypeORM** with PostgreSQL
- `synchronize: false` — schema changes require migrations
- Current schema has NO auto-migrations. If you add/change entities, create a migration:
  ```bash
  cd backend
  npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:generate -d data-source.ts migrations/MigrationName
  ```
- Migrations are `.ts` files in `backend/migrations/` — they run via CLI, NOT at app startup
- **DO NOT set `synchronize: true`** — this will alter production tables

### Authentication

- **Mini-app API**: Telegram WebApp `initData` sent via `X-Init-Data` header. Backend validates HMAC signature against BOT_TOKEN. Some legacy endpoints also accept `initData` in request body (backward compat).
- **Admin API**: JWT token from `/api/admin/login`. Token sent via `AdminAuthGuard`. Login is rate-limited (5 req/min).
- **Telegram bot webhook**: Protected by `WEBHOOK_SECRET` header verification (optional).
- **YooKassa webhook**: IP-based verification against YooKassa IP ranges. Behind nginx, uses X-Forwarded-For from localhost.

## Deployment

### Server Setup

- **VPS**: Ubuntu, accessible via SSH
- **Process manager**: PM2 (`pm2 start dist/main.js --name vpn-bot`)
- **Reverse proxy**: Nginx
  - `vpn.sellwhy.ru` → `/var/www/vpn-mini-app/` (mini-app static files)
  - `admin domain` → `/var/www/vpn-admin/` (admin static files)
  - API proxy → `localhost:3100` (backend)
- **Database**: PostgreSQL 16 (via docker-compose or host-level)

### CI/CD Pipeline (GitHub Actions)

File: `.github/workflows/deploy.yml`

On push to `main`:
1. **build-check** job: Installs and builds all 3 packages (backend, mini-app, admin)
2. **deploy** job (requires build-check): SSH into server and:
   - `git fetch && git reset --hard origin/main && git clean -fd`
   - Saves/restores `.env` files around git reset
   - `cd backend && npm ci && npm run build && pm2 restart vpn-bot`
   - `cd mini-app && npm ci && npm run build` → copies to `/var/www/vpn-mini-app/`
   - `cd admin && npm ci && npm run build` → copies to `/var/www/vpn-admin/`
   - `nginx -s reload`

### Manual Deploy / Debugging

```bash
ssh server
cd /root/vpn_bot

# Pull latest
git pull

# Backend
cd backend
npm ci
rm -rf dist        # Clean old build
npm run build
ls dist/main.js    # VERIFY this file exists!
pm2 restart vpn-bot

# Check logs
pm2 logs vpn-bot --lines 30

# Mini-app
cd ../mini-app
npm ci && npm run build
rm -rf /var/www/vpn-mini-app/* && cp -r dist/* /var/www/vpn-mini-app/

# Admin
cd ../admin
npm ci && npm run build
rm -rf /var/www/vpn-admin/* && cp -r dist/* /var/www/vpn-admin/

nginx -s reload
```

## Backend Modules

| Module | Purpose |
|--------|---------|
| `user/` | Telegram users, referral codes, bonus days |
| `plan/` | VPN subscription plans (price, duration, traffic) |
| `server/` | 3X-UI VPN servers management |
| `subscription/` | Active subscriptions, server changes, traffic sync |
| `payment/` | Stars & YooKassa payments, webhook handling |
| `bot/` | Telegram bot commands, callbacks, inline queries |
| `admin/` | Admin API (dashboard, CRUD, broadcast) |
| `promo/` | Promo codes + personal discounts |
| `vpn/` | 3X-UI API client (create/delete/toggle VPN clients) |
| `shared/` | Config validation, Telegram auth, cron jobs |

## API Endpoints

### Public API (`/api/`)
- `GET /api/health` — Health check
- `GET /api/plans` — List active plans
- `GET /api/servers` — List active servers
- `GET /api/subscription` — Get active subscription (auth: X-Init-Data)
- `POST /api/create-invoice` — Create Telegram Stars invoice
- `POST /api/create-yokassa-payment` — Create YooKassa payment
- `POST /api/validate-promo` — Validate promo code
- `GET /api/profile` — User profile & referral info
- `POST /api/subscription/change-server` — Change VPN server

### Admin API (`/api/admin/`)
- All endpoints require `AdminAuthGuard` (JWT Bearer token)
- `POST /api/admin/login` — Login (rate limited)
- CRUD for users, subscriptions, plans, servers, payments, promos, personal discounts
- `POST /api/admin/broadcast` — Send message to all users

### Webhooks
- `POST /bot/webhook` — Telegram bot webhook
- `POST /api/payments/yokassa/webhook` — YooKassa payment webhook (IP-verified)

## Frontend Notes

### Mini-app (`mini-app/`)
- Runs inside Telegram WebApp
- Uses `window.Telegram.WebApp` for auth, haptic feedback, back button
- API client: `src/api/client.ts` — all requests go through `request()` helper
- Auth: `initData` sent via `X-Init-Data` header
- Routes are lazy-loaded with `React.lazy` + `Suspense`

### Admin (`admin/`)
- Standalone React SPA
- Auth: JWT token stored in localStorage, checked for expiry on each route
- API client: `src/api/client.ts`

## Common Pitfalls

1. **dist/ structure breaks** — Any `.ts` file in `backend/` root not excluded in `tsconfig.build.json` makes TypeScript nest output under `dist/src/`, breaking `dist/main.js` entry point
2. **Frontend sends initData in header, backend must read from header** — If adding new authenticated endpoints, use `@Headers('x-init-data')` with body fallback
3. **YooKassa IP check** — Server is behind nginx, so `req.socket.remoteAddress` is always `127.0.0.1`. Must use `X-Forwarded-For` when socket IP is localhost
4. **PM2 restart loops** — If backend crashes, PM2 keeps restarting (check restart count `↺`). Use `node dist/main.js` to see actual error
5. **git clean -fd on deploy** — Removes `dist/`, so build MUST succeed or PM2 has nothing to run
6. **Env validation** — `ADMIN_PASSWORD` and `JWT_SECRET` are required. App won't start without them
