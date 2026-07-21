# ADR-0001: Implementation-first development

- Status: Accepted
- Date: 2026-07-21

## Context

Lk_uni accumulated a large amount of architectural planning while the repository already contained partial implementations with different maturity levels. Continuing to add conceptual modules would increase the gap between documentation and the working product.

## Decision

Development will proceed implementation-first:

- only the current iteration is detailed;
- future capabilities remain backlog items;
- completed functionality is claimed only after code, verification, tests, and documentation exist;
- repository documentation describes the current state and clearly labels planned work;
- no new major module begins until the active iteration meets its Definition of Done.

## Consequences

Positive:

- documentation remains trustworthy;
- progress becomes measurable;
- defects are surfaced early;
- scope is controlled.

Trade-offs:

- some long-term ideas will remain intentionally unspecified;
- delivery may appear slower than producing conceptual roadmaps, but each completed step creates usable product value.
