# Iteration 001 — Reproducible Product Baseline

## Status

Active: remote technical audit completed; local clean-run verification pending.

## Goal

Turn the current Lk_uni repository into a reproducible development baseline that a developer can clone, configure, start, and verify using documented commands.

This iteration does not add new product modules.

## Current technical baseline

The current repository uses:

- Node.js and Express for the backend;
- PostgreSQL through `pg` and Knex;
- React/Vite for the frontend;
- JWT access and refresh tokens;
- PostgreSQL migration and authentication integration tests;
- a separate read-only ChatGPT User App workspace.

The repository already contains a first Auth Core vertical. The iteration therefore validates and stabilizes existing code rather than recreating it.

Detailed findings: [Technical Audit](TECHNICAL_AUDIT_2026-07-23.md).  
Ordered work: [Delivery Plan](DELIVERY_PLAN.md).

## Scope

1. Verify the current repository structure and startup paths on a clean local clone.
2. Confirm required Node.js, npm, PostgreSQL, and environment versions.
3. Verify a safe `.env.example` without credentials.
4. Make backend startup and PostgreSQL connection verification reproducible.
5. Verify the existing `/health` endpoint against PostgreSQL.
6. Confirm frontend startup and production build.
7. Confirm PostgreSQL migrations can be applied to a clean database.
8. Run database and Auth Core tests in memory and against PostgreSQL 16.
9. Run the ChatGPT App syntax check.
10. Check the repository for legacy MySQL files, imports, dependencies, and obsolete instructions.
11. Align `README.md` and `PROJECT_STATUS.md` with verified facts.
12. Record all discovered defects as separate GitHub Issues.

## Known audit findings to verify locally

- backend health endpoint already exists and checks the database;
- project-aware registration, verification, login, refresh, logout and session routes exist;
- verification and login require `AUTH_DEMO_MODE=true` until real providers are implemented;
- frontend is currently a prototype and is not proven to be integrated with Auth Core;
- frontend dependencies use `latest` and must be pinned later;
- no root `docker-compose.yml` was confirmed during remote audit;
- GitHub combined status did not expose checks for the latest main commit, so CI claims require verification;
- Account Recovery, real provider adapters, OAuth/OIDC, administrative consoles and commercial modules are not part of the implemented baseline.

## Out of scope

- new OAuth providers;
- billing;
- enterprise integrations;
- new administrator interfaces;
- expansion of the ChatGPT App;
- replacement of the current Node.js backend with another framework;
- production deployment;
- new visual prototypes not connected to the API.

## Acceptance criteria

- [ ] A clean clone can be configured using repository documentation.
- [ ] Supported Node.js, npm and PostgreSQL versions are documented.
- [ ] No real secrets are required from committed files.
- [ ] PostgreSQL connectivity is verified by a documented command.
- [ ] Database migrations apply successfully to a clean database.
- [ ] Backend starts without an unhandled error.
- [ ] `GET /health` returns a successful response with PostgreSQL available.
- [ ] Frontend development server starts.
- [ ] Frontend production build completes.
- [ ] Existing database migration tests pass.
- [ ] Existing Auth Core integration tests pass in memory.
- [ ] Existing Auth Core integration tests pass against PostgreSQL 16.
- [ ] ChatGPT App syntax check passes.
- [ ] Legacy MySQL runtime is absent or recorded as an explicit defect.
- [ ] `README.md` and `PROJECT_STATUS.md` accurately describe the current implementation.
- [ ] Known failures are documented as Issues rather than hidden.

## Verification commands

The exact final commands must be confirmed locally. The current package scripts indicate the following starting point:

```bash
cd backend
npm ci
npm run db:check
npm run db:migrate
npm run db:seed
npm run db:test
npm run auth:test
npm run start
```

Frontend verification starts from the repository root:

```bash
npm ci
npm run dev
npm run build
npm run chatgpt:check
```

The real PostgreSQL Auth Core test also requires the environment used by the CI workflow and must be documented after successful execution.

## Deliverables

- updated `README.md`;
- corrected `PROJECT_STATUS.md`;
- safe environment template;
- verified health endpoint;
- reproducible database migration path;
- passing baseline tests or explicit defect Issues;
- clean-run evidence recorded in the implementation PR;
- implementation pull request linked to Issue #5.
