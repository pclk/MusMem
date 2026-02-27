# MusMem

MusMem is a Next.js typing trainer backed by Prisma and Neon Postgres.

## Getting Started

Install dependencies and run the development server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment / Environment Variables

Before the **first Vercel deploy**, you must configure required environment variables in your Vercel project settings for the appropriate environments (**Production**, **Preview**, and **Development**):

- `DATABASE_URL`
- `DIRECT_URL`
- `SESSION_SECRET`

### Required values

- `DATABASE_URL`: Neon pooled connection string used by Prisma at runtime.
- `DIRECT_URL`: Neon direct (non-pooled) connection string used by Prisma for migrations/introspection.
- `SESSION_SECRET`: Strong random secret (32+ characters) used to encrypt session cookies.

### Vercel setup checklist

1. Go to **Project → Settings → Environment Variables** in Vercel.
2. Add `DATABASE_URL`, `DIRECT_URL`, and `SESSION_SECRET`.
3. Assign each variable to the environments you use (Production / Preview / Development).
4. Redeploy after adding or changing variables.

A template is provided in `.env.example` for local setup.

## Local environment

Create a local `.env` file (not committed) from `.env.example` and fill in real values:

```bash
cp .env.example .env
```

## Prisma

The Prisma datasource is configured for Neon with:

- `url = env("DATABASE_URL")`
- `directUrl = env("DIRECT_URL")`

Run migrations with:

```bash
pnpm prisma migrate dev
```
