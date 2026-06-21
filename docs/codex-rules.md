# ROPES Codex Rules

These rules apply to all AI-assisted work in this repository.

## Product rules

1. Preserve multi-tenancy. All operational data must be organisation-scoped.
2. Never expose one organisation's data to another organisation.
3. Keep ROPES modular so Trips, Vehicles, Fulcrum Companion and Reporting can become subscription products.
4. Use clearly fake demo data only.
5. Keep the interface mobile-friendly for field use.
6. Use Enarah/ROPES branding consistently: charcoal, ochre, sand, muted earth tones and clean dashboard cards.

## Security rules

1. Do not commit sensitive credentials.
2. Use environment variables for external services.
3. Encrypt third-party API credentials at rest.
4. Do not display saved API tokens after creation.
5. Add server-side permission checks, not only frontend hiding.
6. Add audit logging for permission changes, exports, approvals and external syncs.

## Code rules

1. Prefer TypeScript.
2. Use strict typing where practical.
3. Use Prisma migrations for database changes.
4. Keep changes small and reviewable.
5. Update seed data when adding a visible module.
6. Update README and relevant docs after major changes.
7. Do not remove working functionality unless explicitly requested.
8. Include validation for user-submitted forms.
9. Keep business logic in reusable service/helper functions where possible.
10. Avoid hard-coded organisation IDs except in seed/demo code.

## Pull request rules

Each PR should include:

- Summary
- What changed
- Screens/pages affected
- Testing performed
- Known gaps or follow-up tasks

## Build sequence

1. Documentation and rules
2. Dashboard shell
3. Database schema and seed data
4. Auth and organisation switcher
5. Trips module
6. Vehicles module
7. Fulcrum shell
8. Fulcrum connector
9. Reports
10. AI assistant

## Definition of done for early PRs

A PR is ready when:

- the app still runs or the docs clearly explain that it is documentation-only
- TypeScript and lint errors have not been knowingly introduced
- new pages have placeholder or demo data rather than broken empty states
- organisation scoping is considered in any data model change
- README or docs are updated if setup or architecture changes
