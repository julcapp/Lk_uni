# Lk_uni Backend — reproducible baseline

This directory contains the current Node.js / Express / PostgreSQL Auth Core implementation.

## Prerequisites

- Node.js 20+
- npm
- PostgreSQL 16

## Configuration

Create `backend/.env` from the repository example and set local values only. Do not commit real credentials or secrets.

Minimum runtime variables:

```env
PORT=3000
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=lk_uni
DATABASE_SSL=false
DB_POOL_MIN=2
DB_POOL_MAX=10
JWT_ACCESS_SECRET=replace-with-at-least-32-characters
JWT_REFRESH_SECRET=replace-with-at-least-32-characters
CHALLENGE_SECRET=replace-with-at-least-32-characters
AUTH_DEMO_MODE=true
```

`AUTH_DEMO_MODE=true` is permitted only for local development and automated baseline verification. Production must use `false` and real verification-provider adapters.

## Clean-start verification

Run from the repository root:

```bash
cd backend
npm ci
npm run db:test
npm run auth:test
npm run db:migrate
npm run db:seed
npm run db:check
npm start
```

In another terminal verify:

```bash
curl http://localhost:3000/health
```

Expected result: HTTP 200 and `ok: true` while PostgreSQL is available.

## Available commands

| Command | Purpose |
|---|---|
| `npm start` | Start the backend |
| `npm run dev` | Start with nodemon |
| `npm run db:migrate` | Apply PostgreSQL migrations |
| `npm run db:rollback` | Roll back the latest migration batch |
| `npm run db:seed` | Load development seed data |
| `npm run db:check` | Verify PostgreSQL connectivity |
| `npm run db:test` | Run migration contract tests in memory |
| `npm run auth:test` | Run Auth Core integration tests |

## Baseline acceptance

The backend baseline is accepted only when all of the following are evidenced:

- dependencies install from a clean checkout;
- migrations apply to a clean PostgreSQL 16 database;
- seed completes successfully;
- database and Auth Core tests pass;
- backend starts without an unhandled error;
- `/health` reports PostgreSQL availability;
- no real secrets are committed.

Related work: Issues #5, #7 and #8.
