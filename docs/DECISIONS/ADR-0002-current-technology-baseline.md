# ADR-0002: Preserve the current technology baseline

- Status: Accepted
- Date: 2026-07-21

## Context

Earlier planning discussed a Python/FastAPI backend. The actual repository, however, currently contains a Node.js/Express backend, PostgreSQL integration through Knex and `pg`, React/Vite frontend code, JWT authentication, migrations, tests, and a ChatGPT App workspace.

Replacing the backend framework before the existing baseline is reproducible would introduce unnecessary risk and delay.

## Decision

Iteration 001 will preserve and verify the current implementation stack:

- Node.js;
- Express;
- PostgreSQL;
- Knex migrations;
- React and Vite;
- JWT access and refresh tokens;
- npm workspaces where already configured.

No framework migration is included in Iteration 001.

A future stack change requires a separate ADR supported by a concrete migration plan, measured benefits, compatibility analysis, and implementation capacity.

## Consequences

Positive:

- work starts from existing code rather than restarting;
- current PostgreSQL and Auth Core work is retained;
- the first iteration can focus on reproducibility and defects.

Trade-offs:

- earlier FastAPI planning is not treated as the active implementation plan;
- current technical debt must be documented and addressed incrementally.
