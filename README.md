# MusMem

MusMem is an adaptive typing trainer built with Next.js. It tracks typing performance over time, identifies weak bigrams (letter pairs), and mixes targeted drills into normal practice so your weakest patterns get extra repetition.

## Tech stack

- **Framework:** Next.js (App Router), React, TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL via Prisma + Neon adapter
- **Auth/session:** `iron-session` with cookie-based sessions
- **Validation:** Zod

## Environment variables

MusMem currently uses **only these required environment variables**:

- `DATABASE_URL` — PostgreSQL connection string used by Prisma/Neon adapter.
- `SESSION_SECRET` — cookie encryption secret (must be at least 32 characters).

> `DIRECT_URL` is **not used** by the current Prisma setup and should not be required.

### Local setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create your local env file and set values:

   ```bash
   cp .env.example .env
   ```

3. Run the app:

   ```bash
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## Database and Prisma

Prisma is configured in `prisma/schema.prisma` with a single datasource URL:

- `url = env("DATABASE_URL")`

Useful commands:

```bash
pnpm prisma migrate dev
pnpm prisma studio
```

## Architecture overview

### 1) UI and pages (App Router)

- `app/page.tsx`: landing page; redirects authenticated users to typing.
- `app/login/page.tsx`, `app/register/page.tsx`: authentication UI.
- `app/type/page.tsx`: main training screen with the typing engine.
- `app/stats/page.tsx`: progress dashboards for sessions, bigrams, and keymap metrics.
- `app/settings/page.tsx`: user settings and custom word-list management.

### 2) Typing engine and modes

The core interactive client is `app/type/components/TypingEngine.tsx`.

It supports two practice modes:

- **TEXT mode**
  - Requests text pages from `GET /api/pages/next`.
  - Submits results to `POST /api/pages/complete`.
  - Backend updates per-bigram performance (`BigramStat`) used for adaptive page generation.

- **KEYMAP mode**
  - Requests exercises from `GET /api/pages/next`.
  - Submits command attempts and latency to `POST /api/pages/complete`.
  - Backend updates per-command stats (`KeymapCommandStat`).

### 3) API layer

Route handlers live under `app/api/**` and are protected with session checks.

Main endpoints:

- **Auth**: `api/auth/register`, `api/auth/login`, `api/auth/logout`, `api/auth/me`
- **Practice flow**: `api/pages/next`, `api/pages/complete`
- **Settings**: `api/settings`
- **Stats**: `api/stats`, `api/stats/bigrams`
- **Word lists**: `api/wordlists`, `api/wordlists/[id]`

### 4) Domain logic

- `lib/algorithm/page-generator.ts`: creates adaptive practice text from weak bigram signals.
- `lib/algorithm/bigram.ts`: extracts and aggregates bigram error data from typing results.
- `lib/keymaps/*`: keymap exercise definitions and exercise selection logic.
- `lib/schemas/*`: Zod schemas for request validation.

### 5) Persistence and session

- `lib/db.ts`: Prisma client initialized with Neon adapter.
- `prisma/schema.prisma`: models for users, settings, sessions, bigram stats, keymap stats, and word lists.
- `lib/session.ts`: secure cookie session handling via `iron-session`.

## How to use the web app

1. **Register** a user on `/register` (or log in on `/login`).
2. Go to **Type** (`/type`) and start typing immediately.
3. Use **settings bar** controls on the typing screen to tune:
   - chars per page,
   - targeted practice ratio,
   - mode (TEXT or KEYMAP),
   - active word list.
4. Open **Settings** (`/settings`) to create/delete custom word lists and persist defaults.
5. Open **Stats** (`/stats`) to review recent session metrics, weakest bigrams, and keymap command performance.

## Development notes

- If `SESSION_SECRET` is missing (or too short), session initialization will fail by design.
- `lib/db.ts` includes a localhost fallback database URL for local development if `DATABASE_URL` is unset, but you should still set `DATABASE_URL` explicitly in normal development.
