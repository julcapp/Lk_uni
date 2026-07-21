# Iteration 001 — Reproducible Product Baseline

## Status

Planned.

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

## Scope

1. Audit the current repository structure and startup paths.
2. Confirm required Node.js, npm, PostgreSQL, and environment versions.
3. Define a safe `.env.example` without credentials.
4. Make backend startup and PostgreSQL connection verification reproducible.
5. Confirm or implement a backend health endpoint.
6. Confirm frontend startup and production build.
7. Confirm PostgreSQL migrations can be applied to a clean database.
8. Run the existing database and Auth Core tests.
9. Document exact local startup and verification commands in `README.md`.
10. Record all discovered defects as separate GitHub Issues.

## Out of scope

- new OAuth providers;
- billing;
- enterprise integrations;
- new administrator interfaces;
- expansion of the ChatGPT App;
- replacement of the current Node.js backend with another framework;
- production deployment.

## Acceptance criteria

- [ ] A clean clone can be configured using repository documentation.
- [ ] No real secrets are required from committed files.
- [ ] PostgreSQL connectivity is verified by a documented command.
- [ ] Database migrations apply successfully to a clean database.
- [ ] Backend starts without an unhandled error.
- [ ] A health endpoint returns a successful response.
- [ ] Frontend development server starts.
- [ ] Frontend production build completes.
- [ ] Existing database migration tests pass.
- [ ] Existing Auth Core integration tests pass.
- [ ] `README.md` accurately describes the current implementation and commands.
- [ ] Known failures are documented as Issues rather than hidden.

## Verification commands

The exact final commands must be confirmed during implementation. The current package scripts indicate the following starting point:

```bash
cd backend
npm install
npm run db:check
npm run db:migrate
npm run db:test
npm run auth:test
npm run start
```

Frontend verification starts from the repository root:

```bash
npm install
npm run dev
npm run build
```

## Deliverables

- updated `README.md`;
- safe environment template;
- verified health endpoint;
- reproducible database migration path;
- passing baseline tests or explicit defect Issues;
- implementation pull request linked to the Iteration 001 Issue.
