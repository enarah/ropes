# Prototype Review

This document summarises the current ROPES prototype after the dashboard,
Prisma model, organisation context, Trips MVP, Vehicles MVP and Fulcrum shell
milestones, the first tenant-guarded persistence pass for core Trips and
Vehicles records, and the initial authentication foundation.

## Currently included

- Next.js, TypeScript and Tailwind app foundation.
- Mobile-friendly dashboard shell using ROPES/Enarah colours.
- Navigation for Overview, Organisations, Ranger Operations, Trips, Vehicles,
  Projects, People, Fulcrum, Reports, Compliance and Settings.
- Auth.js/NextAuth foundation with optional Google and Microsoft Entra ID OAuth
  providers configured through environment variables.
- Signed-in user resolution from OAuth email to the app `User` record and
  active organisation memberships.
- Local fake/demo session fallback when database/auth setup is not configured.
- Route-level active membership blocking for dashboard, Trips, Vehicles and
  Fulcrum pages when authentication and the database are configured.
- Organisation-scoped in-memory dashboard/module mock data.
- Initial Prisma schema and clearly fake seed data for organisations, users,
  memberships, roles, projects, ranger programs, organisation capability
  toggles, trips, vehicles, bookings, trip risk assessments, vehicle
  pre-starts, vehicle defects, vehicle maintenance records, Fulcrum
  placeholders and audit logs.
- Tenant guard foundation used by persisted trip and vehicle booking writes.
- Organisation capability-toggle foundation with stable module/capability keys,
  seeded defaults, capability-aware navigation, disabled feature states and
  proof checks for Trips TMP/JMP risk assessment and Vehicles maintenance.
- Capability checks are intentionally separate from tenant guards: tenant
  access decides whether a user can access an organisation, while capabilities
  decide which modules and workflows are enabled inside that organisation.
- AI provider abstraction placeholder describes future no-provider, local LLM
  and frontier/cloud provider modes without storing credentials, adding keys or
  calling any provider.
- APP&B reporting planning foundation adds optional Reporting/Grants capability
  keys, a gated Reporting placeholder page, source template references and
  typed placeholder profile/data-fit definitions for future NIAA/DCCEEW workbook
  mapping.
- Grants and APP&B data model foundation adds organisation-scoped `Grant`,
  `GrantReportingPeriod` and `AppbReport` records, seeded multi-grant examples
  and a capability-gated read-only APP&B overview.
- APP&B template mapping metadata foundation adds code-level template versions,
  expected sheets, sections, fields, repeatable tables, manual/formula-protected
  flags and export-readiness blockers without parsing or generating XLSX files.
- Local APP&B workbook inspection tooling can produce reviewed structural JSON
  or Markdown summaries for local XLSX files, separate from app runtime and
  without committing source workbooks.
- Verified APP&B workbook mapping metadata now records reviewed sheet
  inventories, common sections, formula-protected placeholders, manual-only
  areas and repeatable table candidates while keeping export blocked.
- APP&B report readiness summaries now show safe per-report status counts, top
  blockers and next actions without exposing finance, personnel, narrative or
  workbook values.
- APP&B manual report field capture foundation adds organisation-scoped
  report-only manual values with bounded status/type/sensitivity, guarded
  updates and safe audit metadata while keeping export blocked.
- APP&B manual field UX refinement groups editable fields by category, adds
  status/sensitivity labels and uses field-type-specific controls while keeping
  compact summaries value-free.
- APP&B manual field value preservation now preloads existing values only in
  the editing context, keeps compact summaries value-free and preserves stored
  values on status-only changes.
- APP&B manual field explicit clear controls make value and note clearing
  intentional through a clear action selector while keeping audit metadata
  value-free and workbook export blocked.
- APP&B manual field operator UX now adds compact status guidance and clearer
  preserve, replace and destructive clear wording while keeping manual values
  hidden outside the authorised editing context.
- APP&B exact workbook range mapping metadata now tracks reviewed/review-needed,
  formula-blocked, hidden-sheet and repeatable target status counts while
  keeping workbook export blocked.
- APP&B repeatable table range metadata now tracks header/data/formula row
  concepts, manual-only row groups and expansion rules while keeping all table
  export blocked pending review.
- APP&B workbook mapping review workflow foundation now represents value-free
  review decisions for field mappings and repeatable ranges, with compact
  review summaries and expandable metadata-only panels while keeping workbook
  export blocked.
- APP&B persisted mapping review decision foundation stores report-scoped
  review decisions, short value-free notes, reviewer identity and reviewed
  timestamps with tenant guards, APP&B capability checks and safe audit
  metadata while keeping workbook export blocked.
- APP&B mapping review note safety guardrails now reject obvious unsafe
  review-note patterns server-side, audit only value-free rejection metadata and
  avoid storing or logging rejected note text.
- APP&B review note safety tuning now keeps the deterministic policy in a
  reusable helper with test coverage for allowed short metadata notes and
  rejected fake unsafe examples.
- APP&B mapping review history foundation now shows current value-free
  report-scoped review decisions and rejected-note reason counts without
  exposing raw audit logs, rejected note text, workbook values or manual report
  values.
- APP&B mapping review decision version history now appends organisation-scoped,
  value-free creation and update events while preserving the current
  one-row-per-target decision model. Safe history reads show compact previous
  and new decision metadata only; rejected-note reason counts remain separate
  and workbook export remains blocked.
- APP&B mapping review history readability now shows current decision metadata
  first, keeps the three most recent value-free events visible by default and
  places older events behind a compact local disclosure. Creation and update
  wording is explicit, rejected-note counts remain separate and workbook export
  remains blocked.
- APP&B mapping review history backend limits now load only the shared three
  newest value-free events per target and expose a safe older-event count.
  Current decision metadata and rejected-note counts remain separate, and full
  load-more or pagination stays deferred while workbook export remains blocked.
- APP&B mapping review history load-more now provides an authenticated,
  tenant- and capability-gated per-target action with bounded three-event
  cursor pages, safe remaining-count metadata and minimal append UI. The
  value-free cursor uses the stable reviewed timestamp, created timestamp and
  ID ordering and is verified against the requested target before use. Current
  decision metadata and rejected-note counts remain separate, and workbook
  export remains blocked.
- APP&B mapping review history cursors now use versioned HMAC-SHA-256
  signatures backed by a dedicated server-side production secret. Signature
  verification happens before the existing authorised target-anchor check;
  tampered, unsupported and stale cursors fail safely while cursor content and
  loaded history remain value-free.
- APP&B mapping review operator UX now adds decision guidance, value-free note
  examples, rejected-note handling reminders and clearer newest-three/load-more
  history wording while keeping workbook export blocked.
- APP&B cursor signing configuration now has a central production runtime
  validator. The APP&B overview fails with a clear server-side configuration
  error when the stable shared secret is missing or shorter than 32 UTF-8
  bytes, while the process-local non-production fallback remains available and
  no secret enters cursor payloads or client responses.
- APP&B production readiness guidance now consolidates database and
  authentication setup, active tenant membership, the four required APP&B
  capabilities, shared cursor-secret operations, value-free history and note
  rules, manual-value preservation and all intentionally blocked areas. This
  documents deployment of review/history foundations only; workbook export,
  XLSX generation, uploaded templates, AI calls, APP&B-specific external
  services and broad audit-log browsing remain unavailable.
- APP&B now has a compact runtime readiness panel shown only after tenant and
  capability guards pass. It reports safe database, membership, capability,
  cursor-configuration, report-presence and value-free-history status without
  exposing secret details, workbook/manual values or rejected unsafe note text;
  export remains blocked and unsupported areas remain explicitly labelled.
- The fake demo partner seed now exercises that panel and the review/history
  foundation with APP&B capabilities, fake grant/report and manual-field
  examples, one current mapping decision, five value-free history events and
  safe rejected-note reason metadata only. It stores no rejected text, real
  workbook/manual values or cursor secret, and export remains blocked.
- A docs-only local smoke-test checklist now covers database migration/seed,
  the exact demo APP&B route, readiness/capability rows, authorised manual-value
  visibility, three initial plus two load-more history events, the safe rejected
  reason count and blocked export state, with tenant/config troubleshooting.
- `npm run smoke:appb` now provides a local-only seeded-database check for the
  demo organisation, capabilities, report/manual metadata presence, one review
  decision, five value-free history events, three-plus-two cursor-boundary
  behavior, safe rejected-reason metadata and blocked export state. Output is
  limited to safe pass/fail labels and the manual checklist still covers UI.
- A docs-only APP&B disposable-database runbook now gives developers the exact
  install, Prisma generation, migration, seed, automated smoke and browser
  checklist sequence, with safe expected output and local-failure guidance. It
  explicitly excludes production, CI and workbook-export readiness.
- APP&B operator guidance now documents the current tenant-scoped readiness,
  manual-field, mapping-decision and value-free history workflow, distinguishes
  local demo use from production operation and future export, and covers safe
  failure handling while workbook export remains blocked.
- Trips MVP with Prisma-backed core trip reads/create/update and persisted
  participant, vehicle allocation and itinerary rows when a local database is
  configured, plus explicitly enabled local demo fallback for development.
- Structured trip participant/vehicle/itinerary rows, approval status,
  tenant-guarded approval workflow transitions and placeholder export actions
  in the UI.
- Trip approval notes are persisted as organisation-scoped plain-text records
  with safe author/timestamp display, required reasons for change requests and
  cancellations, and server-side length limits.
- Trip Risk Assessment and Journey Management Plan foundation with a persisted
  organisation-scoped assessment per trip, Enarah trip-type and activity-risk
  classifications, base/final risk calculation, standard risks, mitigations and
  reference display, trip-specific controls, journey equipment, traveller,
  daily check-in and emergency guidance capture, plus concise TMP/JMP summary
  visibility on trip detail pages.
- Trips list filters can narrow by approval state, trip status, timing and
  needs-action views, with visible workflow badges, count chips and short safe
  latest-review-note previews.
- Trips summary cards show lightweight organisation-scoped operational counts
  and link into the filtered Trips list without adding full reporting.
- Vehicles MVP with Prisma-backed vehicle and booking reads, tenant-guarded
  vehicle create/update forms, booking creation/update, server-side overlap
  enforcement for persisted bookings, vehicle booking detail/edit pages, vehicle
  register status filters, compact fleet summary counts, booking status/timing
  filters, compact booking summary counts, booking count visibility, booking
  calendar-style view, client-side overlap warning and tenant-guarded pre-start
  checklist submissions with latest status display.
- Vehicle defect reporting foundation with a persisted organisation-scoped
  defect model, vehicle-scoped report form, tenant-guarded create and status
  update actions, short description and status-note validation, safe audit
  metadata, optional pre-start link and open/latest count/status visibility on
  vehicle register and detail pages.
- Vehicle maintenance record foundation with a persisted organisation-scoped
  maintenance model, vehicle-scoped create form, optional defect link, short
  note validation, safe audit metadata and latest/recent maintenance
  visibility on vehicle register and detail pages.
- Fulcrum shell with demo-only Overview, Connections, Apps & Forms, Field
  Records, Maps, Data Health, AI Assistant, App Builder and Sync Settings pages.
- Fulcrum connection setup can save an organisation-scoped API token encrypted
  at rest when database, auth and encryption key configuration are available.
- Fulcrum connections can run a server-side credential test that decrypts the
  token only on the server, stores safe status metadata and does not sync
  records.
- Fulcrum Sync Settings can queue organisation-scoped sync job placeholder
  records for tested connections, showing recent status without importing
  records.
- Fulcrum Sync Settings can run a manual, capped import for selected Fulcrum
  app IDs from a tested connection, importing app/form metadata before records
  and storing organisation-scoped records with preserved external IDs.
- Fulcrum import validation now checks selected app ID format, app/form payload
  shape and record payload shape, skips unsupported malformed records where
  possible, and filters likely sensitive form values out of
  `rawJson.formValuesPreview`.
- Recent Fulcrum sync job status shows safe import counts for records imported,
  records updated, records skipped, missing GPS and filtered sensitive field
  previews.
- Organisation-scoped audit entries for persisted trip create/update, trip risk
  assessment creation/update, vehicle booking create/update/overlap rejection,
  vehicle pre-start submission, vehicle defect submission and status changes,
  vehicle maintenance record creation, trip approval workflow transitions,
  Fulcrum connection
  save/update/disable, Fulcrum connection test success/failure, sync job
  placeholder events and safe Fulcrum import events.

## Dependency audit triage plan

Recent APP&B validation runs completed `npm install` successfully while
reporting existing dependency audit findings. Dependency remediation should be
handled as a small, reviewable triage pass before any package updates are made.
Do not run broad automated fixes, and do not use `npm audit fix --force`
unless a later issue explicitly scopes a major-upgrade path.

Recommended triage commands:

```bash
npm audit
npm audit --omit=dev
```

Run audit commands from a local shell without printing or pasting secrets,
tokens, database URLs, cursor secrets or other environment values. Audit output
should be treated as package metadata only.

For each finding, document:

- package
- direct or transitive dependency
- severity
- runtime production path or development-tooling only
- affected dependency path
- safe patch or minor update available
- major upgrade required
- proposed action
- deferred issue needed
- validation required after change

Triage should separate runtime risk from development-tooling risk. Findings
that affect production dependencies or request-time code should be prioritised
above findings isolated to local build/test tooling. Findings that are not
currently exploitable in the ROPES context should still be recorded with the
reason, affected path and revisit trigger.

Dependency changes should be small, justified and limited to the package or
lockfile entries needed for the reviewed finding. Avoid unrelated lockfile
churn. Safe patch or minor updates can be grouped only when they share the same
root cause and validation surface. Major framework or tooling upgrades need
separate issues with their own risk notes and rollback plan.

After any future dependency update, run:

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
npx prisma validate
npm run db:generate
git diff --check
```

If a disposable local database is intentionally configured, also run:

```bash
npm run db:migrate
npm run db:seed
npm run smoke:appb
```

Dependency audit work must not change application features, database schema,
seed data, APP&B workbook export behaviour, XLSX generation, uploaded template
storage, AI calls, external services, tenant guards, capability checks or
value-free APP&B review/history boundaries.

## Runtime dependency audit triage snapshot

On 24 August 2026, runtime audit triage for issue #136 inspected:

```bash
npm audit --omit=dev
npm audit --json --omit=dev
```

Initial runtime audit output reported 14 findings: 5 moderate, 8 high and 1
critical. The only narrow direct runtime patch applied in this slice was
`next-auth` from `4.24.14` to `4.24.15`. That patch removes the critical
Auth.js finding and the runtime `uuid` finding that was introduced through
`next-auth`, with a small `package.json` and `package-lock.json` change only.

After the patch, `npm audit --omit=dev` reports 12 findings: 4 moderate, 8 high
and 0 critical. No broad automated fix or forced upgrade was run.

| Package | Direct/transitive | Severity | Dependency path | Context | Safe patch/minor available | Major required | Proposed action | Follow-up |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `next` | Direct | High | `ropes -> next@16.2.9` | Runtime production. ROPES uses the App Router and server actions, so framework advisories should be treated as runtime relevant even where exploitability depends on deployed routing/image/proxy configuration. | Patch candidate `16.2.11` exists; npm currently wants `16.3.2` under the existing range. | No | Open a focused Next.js patch/minor remediation issue, prefer the smallest version that clears direct advisories, then run the full validation suite. | Yes |
| `postcss` | Transitive | High | `ropes -> next -> postcss` | Next framework build/runtime dependency. Current ROPES does not expose user-controlled CSS/source-map processing as an app workflow, but the finding remains tied to the runtime framework package. | Likely through a focused Next.js update or override review. | No | Handle with the Next.js remediation issue; avoid standalone override unless Next cannot remediate cleanly. | Yes |
| `sharp` | Transitive | High | `ropes -> next -> sharp` | Optional Next image optimisation dependency. APP&B does not upload templates, generate XLSX files or process workbook images, but deployed image optimisation should still be reviewed. | Likely through Next.js/sharp update review. | No | Handle with the Next.js remediation issue and verify image optimisation behaviour if used. | Yes |
| `nanoid` | Transitive | High | `ropes -> next -> postcss -> nanoid` | Framework/tooling path under Next/PostCSS. ROPES does not call `nanoid` directly or expose custom generator size inputs. | Likely through Next/PostCSS update review. | No | Track with the Next.js remediation issue. | Yes |
| `prisma` | Direct | High | `ropes -> prisma@7.8.0` and `@prisma/client -> prisma@7.8.0` | Runtime install/tooling scope. Prisma CLI is used for generate, migrate and seed; it is not request-time application code. | Minor `7.9.1` is available for Prisma packages. | No | Open a focused Prisma-family minor update issue covering `prisma`, `@prisma/client` and `@prisma/adapter-pg` together. | Yes |
| `@prisma/config` | Transitive | High | `prisma -> @prisma/config -> deepmerge-ts` | Prisma CLI/config tooling path, not app request-time code. | Likely through Prisma-family minor update. | No | Track with the Prisma-family update issue. | Yes |
| `deepmerge-ts` | Transitive | High | `prisma -> @prisma/config -> deepmerge-ts` | Prisma config merge tooling path. No current ROPES workflow accepts recursive user-controlled config objects for this package. | Likely through Prisma-family minor update. | No | Track with the Prisma-family update issue. | Yes |
| `@prisma/dev` | Transitive | Moderate | `prisma -> @prisma/dev` | Prisma CLI/development tooling path, not ROPES request-time code. | Likely through Prisma-family minor update. | No | Track with the Prisma-family update issue. | Yes |
| `@hono/node-server` | Transitive | Moderate | `prisma -> @prisma/dev -> @hono/node-server` | Prisma development tooling server path. ROPES does not use Hono as its app server. | Likely through Prisma-family minor update. | No | Track with the Prisma-family update issue. | Yes |
| `hono` | Transitive | Moderate | `prisma -> @prisma/dev -> hono` | Prisma development tooling dependency. ROPES request handling is Next.js, not Hono. | Likely through Prisma-family minor update. | No | Track with the Prisma-family update issue. | Yes |
| `valibot` | Transitive | Moderate | `prisma -> @prisma/dev -> valibot` | Prisma development tooling validation path. ROPES does not call this dependency directly. | Likely through Prisma-family minor update. | No | Track with the Prisma-family update issue. | Yes |
| `fast-uri` | Transitive | High | `prisma -> @prisma/dev -> @prisma/streams-local -> ajv -> fast-uri` | Prisma tooling/validation path, not ROPES request-time URL parsing. | Likely through Prisma-family minor update. | No | Track with the Prisma-family update issue. | Yes |

The attempted Next patch was not retained in this slice because the package
install did not complete cleanly in the local environment and produced no
Next-related lockfile diff. Keep the Next remediation separate so the framework
patch/minor choice, lockfile impact and validation results stay easy to review.

## Next.js runtime audit remediation plan

Issue #138 should remain a planning-only slice. It documents the next focused
dependency remediation PR without changing `next`, package metadata, application
features, schema, seed data, APP&B workbook export behaviour, tenant guards,
capability checks or value-free APP&B review/history boundaries.

On 24 August 2026, `npm audit --omit=dev` and
`npm audit --json --omit=dev` still report 12 runtime-scope findings after the
`next-auth` patch: 4 moderate, 8 high and 0 critical. The Next.js-related
cluster is:

| Finding/package | Direct or transitive | Dependency path | Likely remediation path | Smallest target to try first | Validation needed | Follow-up |
| --- | --- | --- | --- | --- | --- | --- |
| `next` advisories | Direct | `ropes -> next@16.2.9` | Update `next` through the smallest safe patch/minor path that clears direct App Router, Server Action, middleware/proxy, rewrite, cache and image optimisation advisories. | Treat `16.2.11` as the direct-advisory floor, but prefer testing `16.3.2` first because it is the current npm audit candidate under `^16.2.9` and also carries patched transitive ranges. | Full test/type/lint/build suite, plus focused App Router page load, server-action save paths, middleware/proxy/routing behaviour and image optimisation review if deployed. | Yes: focused Next.js remediation PR. |
| `postcss` | Transitive through `next` | `ropes -> next -> postcss` | Handle through the Next.js update first. Avoid a standalone override unless a Next patch/minor cannot remediate cleanly. | `next@16.2.11` still declares `postcss@8.4.31`, which remains in the vulnerable range; `next@16.3.2` declares `postcss@8.5.23`. | Confirm `npm audit --omit=dev` no longer reports the nested Next/PostCSS path; run CSS/Tailwind build validation. | Same Next.js remediation PR unless unresolved. |
| `sharp` | Transitive/optional through `next` | `ropes -> next -> sharp` | Handle through the Next.js update first. Avoid direct optional dependency pinning unless Next cannot remediate cleanly. | `next@16.2.11` declares `sharp@^0.34.5`, which may remain vulnerable; `next@16.3.2` declares `sharp@^0.35.3`. | Confirm image optimisation dependency path and build behaviour; if image optimisation is enabled in deployment, validate representative image routes. | Same Next.js remediation PR unless unresolved. |
| `nanoid` | Transitive through `next`/`postcss` | `ropes -> next -> postcss -> nanoid` | Handle through the Next/PostCSS remediation path first. ROPES does not call `nanoid` directly or expose custom generator-size inputs. | Expected to clear only if the Next/PostCSS dependency graph stops pulling vulnerable `nanoid`; verify with audit output after the Next update. | Confirm no remaining nested `nanoid` audit finding; no standalone override unless Next cannot remediate cleanly. | Same Next.js remediation PR unless unresolved. |

The existing semver range is `next: ^16.2.9`, so a future install may resolve to
`16.3.2` without a major upgrade. The future remediation PR should keep the diff
small and reviewable: expect `package-lock.json` updates for `next`,
`@next/env`, platform SWC optional packages, `postcss`, `sharp` and related
transitives; update `package.json` only if pinning the intended minimum version
is clearer than relying on the existing caret range. If the lockfile changes
expand beyond the Next/PostCSS/sharp/nanoid cluster, stop and document the
unexpected churn before proceeding.

Validation for the future Next.js remediation PR:

```bash
npm install
npm audit --omit=dev
npm audit --json --omit=dev
npm test
npm run typecheck
npm run lint
npm run build
npx prisma validate
npm run db:generate
git diff --check
```

If a disposable local database is intentionally configured, also run:

```bash
npm run db:migrate
npm run db:seed
npm run smoke:appb
```

Do not use `npm audit fix --force`, do not apply a Next major upgrade, and do
not remediate Prisma-family findings in the Next.js PR. Any Prisma-family
findings that remain after the Next slice should stay in a separate focused
Prisma update issue. APP&B workbook export remains blocked throughout this
work, and no XLSX generation, uploaded template storage, AI calls or external
services should be added.

## Next.js runtime audit remediation result

Issue #140 applied the focused Next.js remediation path by updating the direct
`next` dependency from `^16.2.9` to `^16.3.2`. This stayed within the existing
Next.js major version and avoided `npm audit fix --force`, broad automated
fixes, Prisma-family dependency updates, application feature changes, schema
changes and seed-data changes.

Post-update dependency inspection shows the targeted cluster now resolves as:

| Package | Path after update | Result |
| --- | --- | --- |
| `next` | `ropes -> next@16.3.2` | Direct Next.js advisories cleared from `npm audit --omit=dev`. |
| `postcss` | `ropes -> next -> postcss@8.5.23` | Nested Next/PostCSS audit findings cleared through the Next dependency graph. |
| `sharp` | `ropes -> next -> sharp@0.35.3` | Optional Next/sharp audit finding cleared through the Next dependency graph. |
| `nanoid` | `ropes -> postcss -> nanoid@3.3.18` | Nanoid finding cleared through the PostCSS dependency graph. |

After the update, `npm audit --omit=dev` reports 8 remaining runtime-scope
findings: 4 moderate, 4 high and 0 critical. Those remaining findings are the
Prisma-family cluster only:

- direct `prisma`
- transitive `@prisma/config`
- transitive `@prisma/dev`
- transitive `@hono/node-server`
- transitive `deepmerge-ts`
- transitive `fast-uri`
- transitive `hono`
- transitive `valibot`

Keep those remaining findings out of Next.js remediation work and address them
through a separate focused Prisma-family update issue. APP&B workbook export
remains blocked, and the APP&B tenant, capability and value-free review/history
boundaries remain unchanged.

## Prisma-family runtime audit remediation plan

Issue #142 is a planning-only slice for the remaining Prisma-family audit
cluster. It must not update dependencies, run `npm audit fix --force`, apply
major upgrades, change application features, change database schema or seed
data, or change APP&B workbook export, tenant, capability or value-free
review/history boundaries.

After the Next.js remediation in issue #140, `npm audit --omit=dev` reports 8
remaining runtime-scope findings: 4 moderate, 4 high and 0 critical. The
remaining findings are isolated to the Prisma CLI/config/dev dependency graph:

| Finding/package | Direct or transitive | Dependency path | Context | Likely remediation path | Smallest target to try first | Validation needed | Follow-up |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `prisma` | Direct dev dependency | `ropes -> prisma@7.8.0` | Prisma CLI/tooling used for generate, validate, migrate and seed. It is installed in the project but is not request-time ROPES application code. | Update the Prisma family together, not with a broad audit fix. | `prisma@7.9.1`, matching the current available patch/minor line. | `prisma validate`, `prisma generate`, lockfile review, full test/type/lint/build suite. | Yes: focused Prisma-family remediation PR. |
| `@prisma/client` | Direct runtime dependency | `ropes -> @prisma/client@7.8.0`; generated client consumed by request-time code | Request-time ROPES data access depends on the generated Prisma client, so it should stay version-aligned with the CLI even though the reported advisories come through Prisma tooling packages. | Update with `prisma` to keep generated client/runtime compatibility. | `@prisma/client@7.9.1`. | Regenerate client, typecheck all Prisma enum/client imports, run app build and tests. | Same Prisma-family PR. |
| `@prisma/adapter-pg` | Direct runtime dependency | `ropes -> @prisma/adapter-pg@7.8.0` | Request-time database adapter for PostgreSQL. Not named in the audit finding, but should remain aligned with Prisma client/CLI. | Update with `prisma` and `@prisma/client`. | `@prisma/adapter-pg@7.9.1`. | Typecheck DB adapter setup and run build/tests; run DB smoke only with disposable DB. | Same Prisma-family PR. |
| `@prisma/config` | Transitive | `prisma -> @prisma/config -> deepmerge-ts` | Prisma CLI/config tooling path, not request-time app code. | Expect remediation through the Prisma-family update. Avoid direct transitive overrides unless Prisma cannot remediate cleanly. | Prisma family `7.9.1`. | Confirm audit result and inspect lockfile path. | Same Prisma-family PR unless unresolved. |
| `@prisma/dev` | Transitive | `prisma -> @prisma/dev` | Prisma CLI/dev tooling path, not ROPES request handling. | Expect remediation through the Prisma-family update. | Prisma family `7.9.1`. | Confirm `@hono/node-server`, `hono` and `valibot` paths update or disappear as expected. | Same Prisma-family PR unless unresolved. |
| `@hono/node-server` | Transitive | `prisma -> @prisma/dev -> @hono/node-server` | Prisma development tooling server path. ROPES request handling is Next.js, not Hono. | Expect remediation through the Prisma-family update; do not add Hono directly. | Prisma family `7.9.1`. | Confirm audit result and no new request-time Hono usage. | Same Prisma-family PR unless unresolved. |
| `hono` | Transitive | `prisma -> @prisma/dev -> hono` | Prisma development tooling dependency. ROPES does not use Hono as its app server. | Expect remediation through the Prisma-family update. | Prisma family `7.9.1`. | Confirm audit result and lockfile path. | Same Prisma-family PR unless unresolved. |
| `valibot` | Transitive | `prisma -> @prisma/dev -> valibot` | Prisma development tooling validation path. ROPES does not call `valibot` directly. | Expect remediation through the Prisma-family update. | Prisma family `7.9.1`. | Confirm audit result and lockfile path. | Same Prisma-family PR unless unresolved. |
| `deepmerge-ts` | Transitive | `prisma -> @prisma/config -> deepmerge-ts` | Prisma config merge tooling path. ROPES does not accept user-controlled Prisma config objects at request time. | Expect remediation through the Prisma-family update; avoid standalone override unless Prisma cannot remediate cleanly. | Prisma family `7.9.1`. | Confirm audit result and no unrelated deep merge package churn. | Same Prisma-family PR unless unresolved. |
| `fast-uri` | Transitive | `prisma -> @prisma/dev -> @prisma/streams-local -> ajv -> fast-uri` | Prisma tooling/validation path, not ROPES request-time URL parsing. | Expect remediation through the Prisma-family update. | Prisma family `7.9.1`. | Confirm audit result and lockfile path. | Same Prisma-family PR unless unresolved. |

The future remediation PR should first run `npm audit --omit=dev` and
`npm audit --json --omit=dev`, then attempt the smallest same-line Prisma-family
patch/minor update for `prisma`, `@prisma/client` and `@prisma/adapter-pg`
together. Keeping those packages version-aligned is safer than updating only the
CLI because ROPES relies on Prisma-generated client types, runtime data access
and the PostgreSQL adapter. The expected tracked diff should be limited to
`package.json`, `package-lock.json` and documentation if the audit results or
known gaps need recording; generated Prisma client output lives in
`node_modules` and should be validated, not committed.

After the future update, inspect the package and lockfile diff for unrelated
dependency churn. Stop and document the unexpected scope if the diff expands
beyond Prisma-family packages and their transitive tooling dependencies. Do not
change Prisma schema, migrations, seed data, application behaviour, APP&B
workbook export, XLSX generation, uploaded template storage, AI calls, external
services, tenant guards, capability checks or value-free APP&B review/history
boundaries.

Validation for the future Prisma-family remediation PR:

```bash
npm install
npm audit --omit=dev
npm audit --json --omit=dev
npm test
npm run typecheck
npm run lint
npm run build
npx prisma validate
npm run db:generate
git diff --check
```

If a disposable local database is intentionally configured, also run:

```bash
npm run db:migrate
npm run db:seed
npm run smoke:appb
```

If any Prisma-family findings remain after the patch/minor update, document the
remaining package, dependency path, request-time relevance and whether a
separate major-upgrade issue is needed. Do not hide unresolved findings and do
not use `npm audit fix --force` as a shortcut.

## Prisma-family runtime audit remediation result

Issue #144 applied the focused Prisma-family remediation path by updating the
aligned Prisma packages from `^7.8.0` to `^7.9.1`:

- `prisma`
- `@prisma/client`
- `@prisma/adapter-pg`

The update kept the Prisma CLI, generated client package and PostgreSQL adapter
on the same Prisma release line. It did not run `npm audit fix --force`, apply a
major upgrade, change application features, change Prisma schema or seed data,
or change APP&B workbook export, tenant, capability or value-free
review/history boundaries.

The Prisma dependency graph after the update is:

| Package | Path after update | Result |
| --- | --- | --- |
| `prisma` | `ropes -> prisma@7.9.1` | Direct Prisma package updated, but the aggregate audit finding remains because Prisma still depends on vulnerable tooling packages. |
| `@prisma/client` | `ropes -> @prisma/client@7.9.1` | Client package remains aligned with the Prisma CLI. |
| `@prisma/adapter-pg` | `ropes -> @prisma/adapter-pg@7.9.1` | PostgreSQL adapter remains aligned with the Prisma client. |
| `@prisma/dev` | `prisma -> @prisma/dev@0.24.17` | Updated through Prisma; the prior `@hono/node-server`, `hono` and `valibot` audit paths are no longer reported. |
| `@prisma/streams-local` / `fast-uri` | `prisma -> @prisma/dev -> @prisma/streams-local@0.1.11 -> ajv -> fast-uri@3.1.7` | Updated through Prisma; the prior `fast-uri` audit finding is no longer reported. |
| `@prisma/config` / `deepmerge-ts` | `prisma -> @prisma/config@7.9.1 -> deepmerge-ts@7.1.5` | Still reported by `npm audit --omit=dev`; no same-line Prisma patch/minor currently removes this path. |
| `mysql2` | `prisma -> mysql2@3.15.3` | Newly reported under the Prisma CLI dependency graph; npm marks the available remediation as a forced downgrade to `prisma@6.19.3`, which is out of scope. |

On 11 September 2026, the post-update `npm audit --omit=dev` result reports 7
runtime-scope findings: 1 moderate, 5 high and 1 critical. The remaining
Prisma-family findings are:

- direct aggregate `prisma`
- transitive `@prisma/config`
- transitive `deepmerge-ts`
- transitive `mysql2`

The same audit output also reports current non-Prisma findings for
`baseline-browser-mapping`, `next` and `sharp`. Those are outside the
Prisma-family remediation scope and should be triaged in separate focused
issues. Do not remediate them by broad automated audit fixes in the Prisma PR.

The remaining Prisma-family risk is still in Prisma CLI/config/tooling
dependencies, not in request-time ROPES application code. ROPES uses PostgreSQL
through `@prisma/client` and `@prisma/adapter-pg`; it does not use Prisma's
bundled MySQL client dependency for request-time application database access.

If a future Prisma release removes the `deepmerge-ts` and `mysql2` audit paths,
prefer another focused same-line Prisma-family update. If npm continues to
suggest `npm audit fix --force` or a Prisma major/downgrade path, create a
separate planning issue before applying it.

## Audit regression triage after Prisma update

Issue #146 captures the current runtime audit state after the focused
Prisma-family update in issue #144. This is a triage snapshot only: it should
not update dependencies, run `npm audit fix --force`, change application
features, change schema or seed data, or change APP&B workbook export, tenant,
capability or value-free review/history boundaries.

On 11 September 2026, the required commands were:

```bash
npm audit --omit=dev
npm audit --json --omit=dev
npm ls next sharp baseline-browser-mapping prisma @prisma/config deepmerge-ts mysql2 --all
```

`npm audit --omit=dev` reports 7 current runtime-scope findings: 1 moderate, 5
high and 1 critical.

| Finding/package | Group | Direct or transitive | Dependency path observed | Current triage | Follow-up |
| --- | --- | --- | --- | --- | --- |
| `next` | Non-Prisma | Direct | `ropes -> next@16.3.2`; also required by `next-auth` | Critical advisories published on 8 September 2026 affect `next >=16.0.0 <16.3.3`. This is a newly disclosed/current audit-feed finding after PR #141, not evidence that PR #141 regressed the dependency graph. Because Next serves request-time application routes, this needs urgent focused remediation. | Open a focused Next.js patch issue, likely testing the smallest safe update at or above `16.3.3`. |
| `sharp` | Non-Prisma | Transitive optional dependency | `ropes -> next@16.3.2 -> sharp@0.35.3` | High advisory published on 8 September 2026 affects `sharp <0.35.4`. This is tied to Next image optimisation packaging in the current graph and should be remediated with the focused Next.js/image dependency path where possible. | Include in the focused Next.js follow-up unless Next cannot lift `sharp`; then plan a narrow image-dependency remediation. |
| `baseline-browser-mapping` | Non-Prisma | Transitive | `ropes -> next@16.3.2 -> baseline-browser-mapping@2.10.38`; also `ropes -> autoprefixer -> browserslist -> baseline-browser-mapping@2.10.38` | Moderate advisory was published on 13 August 2026 and updated on 8 September 2026. It is dependency metadata/build-tooling scope used by Next/Browserslist-style compatibility data, not a ROPES request-time route handler. Current audit feed reports it now; it was not introduced by the Prisma update. | Track with focused Next/tooling audit work; avoid broad lockfile churn. |
| `prisma` | Prisma-family | Direct dev dependency | `ropes -> prisma@7.9.1` | Aggregate high finding remains because the Prisma CLI still depends on vulnerable tooling packages. Prisma CLI is used for generate, validate, migrate and seed, not request-time ROPES handling. | Monitor for a same-line Prisma release that lifts `deepmerge-ts` and `mysql2`; do not use forced downgrade/major remediation. |
| `@prisma/config` / `deepmerge-ts` | Prisma-family | Transitive | `ropes -> prisma@7.9.1 -> @prisma/config@7.9.1 -> deepmerge-ts@7.1.5` | High tooling/config finding remains. ROPES does not accept user-controlled Prisma config objects at request time. npm currently reports the available fix through `npm audit fix --force`, which would install `prisma@6.19.3` and is out of scope. | Create a follow-up only when Prisma publishes a safe same-line fix, or plan a separate major/downgrade investigation explicitly. |
| `mysql2` | Prisma-family | Transitive | `ropes -> prisma@7.9.1 -> mysql2@3.15.3` | High finding appears through Prisma CLI tooling. ROPES request-time database access uses PostgreSQL through `@prisma/client` and `@prisma/adapter-pg`; it does not use Prisma's bundled MySQL client dependency for application DB access. npm currently reports only a forced Prisma downgrade path. | Track with Prisma-family follow-up; do not add direct MySQL usage or broad overrides in this triage slice. |

The #146 dependency graph confirms that PR #145 cleared the previously reported
Prisma-family `@hono/node-server`, `hono`, `valibot` and vulnerable `fast-uri`
paths. The current graph shows `fast-uri@3.1.7` under Prisma tooling, which is
outside the reported vulnerable range.

The most urgent current follow-up is the direct Next.js critical finding because
it affects the request-time web framework package. The `sharp` advisory should
be reviewed with that Next.js follow-up because it is present through Next's
optional image optimisation dependency. The remaining Prisma findings are still
CLI/config/tooling scope for this project, and `baseline-browser-mapping` is
compatibility-data/build-tooling metadata scope.

`npm audit fix --force` remains out of scope because npm currently proposes a
breaking Prisma downgrade for the remaining Prisma-family findings and broad
automated fixes could introduce unrelated lockfile churn. Future remediation
should stay small, focused and reviewable.

## Next.js critical audit remediation after September advisory

Issue #148 applied the focused remediation path for the direct critical Next.js
runtime audit finding identified after issue #146. The remediation updated the
direct `next` dependency from `^16.3.2` to `^16.3.4`, staying on the same
Next.js major and minor line while moving above the September advisory floor of
`16.3.3`.

The same focused dependency pass also cleared the related Next/image and
compatibility-data findings without unrelated lockfile churn:

| Package | Path after update | Result |
| --- | --- | --- |
| `next` | `ropes -> next@16.3.4`; also required by `next-auth` | Direct critical Next.js advisories are no longer reported by `npm audit --omit=dev`. |
| `sharp` | `ropes -> next@16.3.4 -> sharp@0.35.4` | Cleared through Next's optional image optimisation dependency path. |
| `baseline-browser-mapping` | `ropes -> next@16.3.4 -> baseline-browser-mapping@2.11.22`; also `ropes -> autoprefixer -> browserslist -> baseline-browser-mapping@2.11.22` | Cleared by a narrow transitive lockfile update under existing package ranges. |

On 11 September 2026, the post-remediation `npm audit --omit=dev` result
reports 4 remaining runtime-scope findings, all high severity and all in the
known Prisma-family CLI/config/tooling cluster:

- aggregate `prisma`
- transitive `@prisma/config`
- transitive `deepmerge-ts`
- transitive `mysql2`

No Next.js, `sharp` or `baseline-browser-mapping` findings remain in the
runtime audit output after this focused pass. The remaining Prisma findings
still require a separate Prisma-family follow-up; do not use
`npm audit fix --force`, because npm currently suggests a breaking Prisma
downgrade path.

This remediation did not change application features, Prisma schema, seed data,
APP&B workbook export, XLSX generation, uploaded template storage, AI calls,
external services, tenant guards, capability checks or value-free APP&B
review/history boundaries.

## Remaining Prisma-family audit findings follow-up plan

Issue #150 is a planning-only follow-up for the Prisma-family audit findings
that remain after issue #148 cleared the urgent non-Prisma audit findings. It
must not update dependencies, run `npm audit fix --force`, change application
features, change Prisma schema or seed data, or change APP&B workbook export,
tenant, capability or value-free review/history boundaries.

On 11 September 2026, the required commands were:

```bash
npm audit --omit=dev
npm audit --json --omit=dev
npm ls prisma @prisma/config deepmerge-ts mysql2 --all
npm view prisma version
npm view @prisma/client version
npm view @prisma/adapter-pg version
```

`npm audit --omit=dev` reports 4 current runtime-scope findings: 0 moderate, 4
high and 0 critical. All remaining findings are in the Prisma CLI/config/tooling
cluster:

| Finding/package | Direct or transitive | Dependency path observed | Request-time ROPES risk | Current remediation signal | Planned next step |
| --- | --- | --- | --- | --- | --- |
| `prisma` | Direct dev dependency | `ropes -> prisma@7.9.1` | Prisma CLI is used for generate, validate, migrate and seed; it is not a request-time ROPES route handler. | npm aggregates the finding through `@prisma/config` and `mysql2`, and currently suggests `npm audit fix --force` with a breaking `prisma@6.19.3` downgrade. | Do not force-fix or downgrade. Monitor for a same-line Prisma release that lifts both transitive paths. |
| `@prisma/config` / `deepmerge-ts` | Transitive | `ropes -> prisma@7.9.1 -> @prisma/config@7.9.1 -> deepmerge-ts@7.1.5` | Prisma config tooling path. ROPES does not accept user-controlled Prisma config objects at request time. | `@prisma/config@7.10.0` still depends on `deepmerge-ts@7.1.5`; `prisma@7.10.0` does not clear this finding. | Wait for Prisma upstream to move to `deepmerge-ts >=8`, or create a separate explicit override-risk investigation. |
| `mysql2` | Transitive | `ropes -> prisma@7.9.1 -> mysql2@3.15.3` | Prisma CLI bundled dependency. ROPES request-time database access uses PostgreSQL through `@prisma/client` and `@prisma/adapter-pg`, not Prisma's bundled MySQL client. | `prisma@7.10.0` still depends on `mysql2@3.15.3`; npm suggests only the forced Prisma downgrade path. | Wait for Prisma upstream to update bundled `mysql2`, or create a separate major/downgrade/override investigation if operational exposure changes. |

Current npm registry inspection shows:

- `npm view prisma version` returns `8.0.0-rc.13`
- `npm view @prisma/client version` returns `7.10.0`
- `npm view @prisma/adapter-pg version` returns `7.10.0`
- stable `prisma@7.10.0` exists, but still depends on `@prisma/config@7.10.0`
  and `mysql2@3.15.3`
- `@prisma/config@7.10.0` still depends on `deepmerge-ts@7.1.5`

Because the stable same-line Prisma candidate does not clear the remaining
findings, the safest next step is monitoring rather than another immediate
dependency PR. Re-check the Prisma-family audit after new stable Prisma 7.x
patch/minor releases, after a Prisma 8 stable release is available and planned,
or at least weekly while these audit findings remain open.

Direct overrides are not the default safe path. Overriding `deepmerge-ts` or
`mysql2` under Prisma could alter Prisma CLI/config/runtime-tooling assumptions
without upstream support. Only consider overrides in a separate issue that
checks Prisma compatibility, generated client behaviour, migration/generate
commands and lockfile scope explicitly.

A separate major-upgrade or downgrade investigation is justified only if one of
these conditions becomes true:

- Prisma publishes guidance requiring a major upgrade or downgrade to remediate
  these advisories.
- The findings move from Prisma CLI/config/tooling into request-time ROPES
  application code.
- ROPES starts using Prisma's bundled MySQL tooling path.
- Production deployment policy requires immediate remediation despite the
  tooling-only exposure.

Until then, keep `npm audit fix --force` out of scope. It currently proposes a
breaking Prisma downgrade and could introduce broad lockfile churn unrelated to
the remaining Prisma-family findings.

## Pull request validation CI plan

Issue #152 planned, and issue #154 added, a lightweight GitHub Actions
validation workflow for pull requests. The workflow lives at
`.github/workflows/pr-validation.yml`, runs on pull requests targeting `main`
and can also be started with `workflow_dispatch`.

The workflow gives reviewers a visible GitHub status check on PR head commits
before merge. It uses the same validation coverage that recent local PR reviews
have relied on:

```bash
npm install
npm run db:generate
npm test
npm run typecheck
npm run lint
npm run build
npx prisma validate
git diff --check
```

The implementation is intentionally small:

| Area | CI behaviour | Notes |
| --- | --- | --- |
| Runner | Uses a standard GitHub-hosted Linux runner. | Keep OS-specific checks out of the first slice unless a failure proves they are needed. |
| Node setup | Pins Node 26, matching the local validation runtime used when the workflow was added. | Revisit if GitHub runner support or project engine requirements change. |
| Install | Runs `npm install` for parity with the current validation checklist. | A separate issue can evaluate switching CI to `npm ci` for stricter lockfile reproducibility. |
| Prisma generation | Runs `npm run db:generate` immediately after install. | Clean runners need generated Prisma types before tests and typecheck. |
| Test suite | Run `npm test`. | This covers the existing Node test files under `tests/**/*.test.ts`. |
| Static checks | Run typecheck, lint and build. | This catches App Router, server-action, Prisma adapter and UI compile regressions. |
| Prisma checks | Run `npx prisma validate`. | This must not require a live production database or commit generated client output from `node_modules`. |
| Whitespace check | Run `git diff --check`. | This should fail PRs with whitespace errors while avoiding broad repository mutation checks. |
| Secrets | Do not expose secrets or environment-specific values. | The baseline workflow should not print database URLs, cursor secrets, tokens or generated cursor payloads. |

Keep database-backed commands out of the first PR validation workflow. Do not
run migrations, seed data or `npm run smoke:appb` in the baseline PR check
unless a separate disposable database workflow is explicitly planned. The local
APP&B smoke-test runbook remains the right path for seeded demo/database
verification.

Do not make `npm audit` a blocking step in the first PR validation workflow.
Audit remediation is tracked separately because known Prisma-family
CLI/config/tooling findings may remain while upstream fixes are monitored. A
future scheduled or manually triggered audit workflow can be planned separately
if maintainers want a non-blocking dependency signal.

The workflow should use least-privilege GitHub token permissions, avoid
uploading dependency or generated-client artifacts by default, and use npm cache
only when it stays keyed to `package-lock.json` and does not obscure clean
install failures.

After the workflow is added and proves stable, repository administrators can
make the new check required in GitHub branch protection. Treat branch protection
configuration as a separate repository setting step, not as a code change in the
workflow PR.

The implementation PR for the workflow should validate locally with the same
command sequence, then verify that a test PR shows the expected GitHub status.
If the workflow uncovers existing failures, document them directly and avoid
weakening the validation commands merely to make the first status check green.

## Pull request validation branch protection rollout plan

Issue #156 plans the repository-settings rollout for making the new pull
request validation workflow a required status check before merging to `main`.
This is documentation-only: do not change application features, dependencies,
schema, seed data, APP&B workbook export, tenant guards, capability checks or
value-free APP&B review/history boundaries in this planning slice.

Before enabling branch protection, confirm the workflow is stable on at least
one current pull request. PR #155 verified the check after the clean-run Prisma
client generation ordering was fixed. The required check to select in GitHub
should be the workflow job status shown for PRs:

- workflow name: `Pull request validation`
- job/check name: `Validate`
- workflow file: `.github/workflows/pr-validation.yml`

Roll out the required check in small operational steps:

1. Open the repository branch protection or ruleset settings for `main`.
2. Add or update the rule that applies to the `main` branch.
3. Require status checks to pass before merging.
4. Select the `Validate` check from the `Pull request validation` workflow.
5. Prefer requiring branches to be up to date before merge if the team wants
   every merge to validate against the latest `main`; otherwise document that
   merge queue or reviewer judgement covers fast-moving branches.
6. Keep administrator bypass behaviour explicit and limited to emergency use.
7. Save the rule and verify a test PR cannot merge while the check is pending
   or failing.
8. Verify a passing PR can still merge through the normal reviewed path.

The rollout should not add database-backed checks, migrations, seed data,
`npm run smoke:appb` or `npm audit` to the required PR gate. Those remain
separate workflows or local runbooks unless explicitly planned later. The
required check should stay focused on install, Prisma client generation, tests,
typecheck, lint, build, Prisma schema validation and whitespace validation.

Expected safe failure behaviour:

- A failing `Validate` check blocks normal merges to `main`.
- A pending, cancelled or missing `Validate` check blocks normal merges when
  branch protection is active.
- Reviewers should inspect the failing job log and fix the branch instead of
  bypassing the check.
- If GitHub Actions has an outage or the workflow is clearly misconfigured,
  use an explicit administrator bypass only if the repository policy permits it,
  then create a follow-up issue to fix the CI gate.

Known rollout caveats:

- GitHub repository settings changes are not represented in the codebase, so
  the rule change must be applied by a repository administrator.
- The check name may appear as `Validate` or as
  `Pull request validation / Validate` depending on GitHub's settings UI; select
  the check associated with `.github/workflows/pr-validation.yml`.
- Existing known dependency audit findings are tracked separately and should not
  be used to weaken this validation gate.
- The workflow currently uses `actions/checkout@v4` and `actions/setup-node@v4`;
  GitHub may show action-runtime deprecation warnings that are not validation
  failures. Plan an actions-version follow-up only if those warnings become
  blocking.

After rollout, add the required status-check expectation to reviewer habits:
reviewed PRs should have a passing `Validate` check before merge, and any PR
body that reports local validation should still defer to the GitHub status check
for merge readiness.

## Controlled live testing deployment readiness plan

Issue #158 adds a [repository-side readiness plan](live-testing-deployment-readiness.md)
for `ropes.enarah.net.au` on Argus. It documents runtime/configuration evidence,
Hera's authority from the dedicated sentinel machine, server questions, safe
test data, authentication, migrations, backup/rollback, access restrictions,
go/no-go and post-deployment checks, and a concise future handover.

Key gaps are explicit: no package start script or dedicated health endpoint,
demo authentication fallback not gated by production mode, destructive seed
behaviour, and seed-command configuration requiring a disposable rehearsal.
The plan is not deployment approval. It makes no server, dependency, schema,
seed, feature or automation changes. APP&B workbook export remains blocked,
with tenant/capability and value-free review/history boundaries unchanged.

## Still demo-only

- Local development still uses fake/demo session fallback when auth providers
  are not configured.
- User invitation, account provisioning and role management UI are not
  implemented.
- Organisation switching still uses query-string UI state, but the available
  options come from active memberships when auth/database are configured.
- Role-specific permission rules beyond active membership checks are not
  implemented yet.
- Admin UI for managing organisation modules and capabilities is not
  implemented yet.
- Dashboard and Fulcrum UI data is in-memory demo data.
- Trip participants are stored as free-text MVP rows; optional linkage to
  existing users remains future work.
- Trip approval workflow notifications and role-specific approval permissions
  are still future work.
- TMP/JMP PDF/DOCX export, live SPOT/GARMIN tracking, notifications and a
  TMP-specific approval step are still future work.
- Live Google Calendar sync, SPOT/finder integrations, Teams/email/calendar
  integrations, AI provider execution and AI credential storage are still
  future work.
- APP&B workbook export, template upload storage, budget/acquittal finance
  logic, production workbook cell/range mapping, mapping admin bulk editing and
  full Grants workflows are still future work.
- Shared vehicles across organisations remain intentionally out of scope.
- Maintenance work orders, maintenance scheduling, full maintenance planning
  and decommission workflows are not implemented yet.
- Full vehicle defect timelines, persisted resolution notes, defect-triggered
  booking blocks and pre-start history reporting are not implemented yet.
- Vehicle booking approval workflows and advanced scheduling are not implemented
  yet.
- Broader calendar/scheduling features remain future work.
- Fulcrum connection testing validates credentials only; record import requires
  a separate manual action from Sync Settings.
- Fulcrum import is a capped MVP for selected app IDs only. It does not import
  media/photos, run background workers, schedule sync, perform broad app/form
  sync or write back to Fulcrum.
- Fulcrum field sensitivity rules are conservative key/label filtering only;
  richer form-schema-aware allowlists remain future work.
- Fulcrum AI Assistant and App Builder are non-functional demo shells and do not
  call AI providers or Fulcrum APIs.
- Maps and data health checks are static placeholders.
- Broader server-side permission enforcement, audit log review UI and wider
  audit coverage are still future work.
