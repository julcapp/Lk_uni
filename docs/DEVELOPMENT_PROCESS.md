# Development Process

## Purpose

Lk_uni is developed as a real product. Progress is measured by running code, verified behavior, tests, and current documentation—not by the number of planned modules.

## Core rules

1. Work proceeds in small, numbered iterations.
2. A new iteration does not start until the current one meets its Definition of Done.
3. Every feature must exist as working code, an API or UI where applicable, tests, and updated documentation.
4. Architecture decisions that materially affect the product are recorded as ADRs.
5. Repository documentation must describe the current implementation. Future ideas belong in Issues and are not presented as completed functionality.
6. Changes are made in a dedicated branch and merged through a pull request.
7. Every issue must have explicit acceptance criteria.
8. Secrets, credentials, and production data must never be committed to Git.

## Standard delivery cycle

1. Create or select a GitHub Issue.
2. Confirm scope and acceptance criteria.
3. Create a dedicated branch.
4. Implement the smallest complete change.
5. Run tests and verification commands.
6. Update documentation.
7. Open a pull request.
8. Review and merge only after the Definition of Done is met.
9. Close the Issue.

## Definition of Done

A task is complete only when all applicable conditions are met:

- the code runs in the documented environment;
- the required behavior is verified;
- automated tests pass;
- database migrations are included when the data model changes;
- no secrets are committed;
- documentation reflects the actual implementation;
- the pull request is reviewed and merged;
- the associated Issue is closed.

## Branch naming

Use short, descriptive names:

- `feature/<scope>`
- `fix/<scope>`
- `docs/<scope>`
- `refactor/<scope>`

## Commit style

Use imperative, scoped commit messages, for example:

- `feat(auth): add password login endpoint`
- `fix(db): handle failed PostgreSQL connection`
- `docs: define iteration 001`

## Current product baseline

The repository currently contains a Node.js/Express backend, React frontend components, PostgreSQL migration work, authentication code, and a read-only ChatGPT User App. The immediate priority is to make the current implementation reproducible, verifiable, and accurately documented before adding new product modules.
