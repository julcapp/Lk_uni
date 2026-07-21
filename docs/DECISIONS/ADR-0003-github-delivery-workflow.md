# ADR-0003: GitHub issue and pull request workflow

- Status: Accepted
- Date: 2026-07-21

## Context

Direct changes to the default branch make it difficult to review scope, connect decisions to implementation, and verify whether acceptance criteria were met.

## Decision

All material changes will follow this workflow:

1. Create a GitHub Issue with scope and acceptance criteria.
2. Create a dedicated branch from `main`.
3. Commit small, reviewable changes.
4. Open a pull request linked to the Issue.
5. Run available tests and checks.
6. Merge only when the applicable Definition of Done is satisfied.
7. Close the Issue after merge and verification.

Documentation-only corrections may use the same workflow and should not bypass review when they change product scope, architecture, or delivery rules.

## Consequences

Positive:

- each change has an auditable reason;
- work can be reviewed before merge;
- incomplete work remains isolated from `main`;
- issues become the source of truth for active scope.

Trade-offs:

- small changes require more process;
- branch and pull request hygiene must be maintained.
