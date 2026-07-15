# House Poker

Invite-only home game poker ledger for hosts and players.

## Phase 2 features

- **Live session** — host starts game, records buy-ins/rebuys per seat
- **Seat map** — running totals (buy-in, rebuy, cash-out, net) per player
- **End game settlement** — enter cash-outs, auto-generate who owes whom
- **CSV export** — download game results and settlements
- **Player live view** — players see only their own running totals during active games

## Phase 3 — Super admin

- Admin console at `/super-admin` (Overview, Users, Games, Audit log, Settings)
- Platform stats, disable/enable users, promote to host, cancel games
- Immutable audit log for all key platform actions
- Configurable platform defaults (currency, buy-in, max players)

## Phase 4 — Polish

- Email notifications via Resend (optional — in-app always works)
- Player stats at `/player/stats` (win rate, P&L, monthly chart)
- QR join codes on each game + `/join/[code]` quick-join page
- Mobile-friendly live session with larger touch targets
- Role-based header navigation and mark-all-read notifications

## Phase 1 features

- Invite-only registration (hosts invite players; no public sign-up)
- Roles: super admin, host, player
- Hosts create cash games with $20 or $50 buy-ins and 8–9 players
- Host auto-seated; first players to confirm online fill remaining seats
- Guest players for a single game without creating accounts
- Player dashboards scoped to their own games, transactions, and settlements
- In-app notifications when hosts invite players to register or confirm a game

## Stack

- Next.js 16 (App Router)
- Clerk authentication
- Neon Postgres + Drizzle ORM
- Tailwind CSS 4 + shadcn/ui

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in:

- **Clerk** keys from [dashboard.clerk.com](https://dashboard.clerk.com)
- **DATABASE_URL** from Neon (Vercel integration recommended)
- **SUPER_ADMIN_EMAIL** — your email (grants super admin + host on first login)
- **NEXT_PUBLIC_APP_URL** — `http://localhost:3000` locally
- **RESEND_API_KEY** (optional) — enables email notifications
- **EMAIL_FROM** (optional) — sender address for Resend

In Clerk Dashboard:

1. Disable public sign-up or restrict registrations to invited users only
2. Set sign-in URL to `/sign-in`

### 3. Database

```bash
npm run db:push
```

### 4. Run locally

```bash
npm run dev
```

## Core flows

### Host creates a game

1. Host opens `/host/games/new`
2. Sets currency, buy-in (20 or 50), max players (8 or 9), schedule
3. Adds player emails
4. Host is auto-seated; invites trigger in-app notifications
5. Unregistered players get a platform invite link; registered players get a game invite link

### Player registers (invite-only)

1. Player opens host invite link `/invite/[token]`
2. Registers with the invited email via Clerk
3. Onboarding validates the invite and creates their account
4. Player confirms game seat at `/game-invite/[token]` (if invited to a game)

### Super admin invites a host

1. Super admin opens `/super-admin/invites`
2. Enters email and selects **Host** as the invite role
3. If the person is not registered, they receive a platform invite link; on sign-up they get host + player roles
4. If already registered, host role is granted immediately

### Host invites players (without a game)

1. Host opens `/host/invite`
2. Adds player emails — each receives a platform invite to register
3. After registration, invite them to specific games from `/host/games/new` or a game detail page

### Host invites players (with a game)

1. Host opens `/host/games/new` or uses **Invite players** on a game page
2. Adds player emails
3. Unregistered players get `/invite/[token]?game=[gameToken]`; registered players get `/game-invite/[token]`

### Player privacy

Players only see:

- Their own game participation
- Their own transactions
- Settlement lines where they are payer or payee
- Ability to mark settlements as settled

## Deployment

The project is linked to Vercel. Add the same environment variables in the Vercel project settings, run `npm run db:push` against production `DATABASE_URL`, then deploy.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run db:push` — push schema to Postgres
- `npm run db:studio` — open Drizzle Studio
