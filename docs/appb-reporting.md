# APP&B Reporting Template Planning

APP&B reporting is planned as an optional Reporting / Grants capability. It must be enabled per organisation and must not become a global default.

This foundation covers Annual Project Plan and Budget templates used by major funders such as National Indigenous Australians Agency (NIAA) and Department of Climate Change, Energy, the Environment and Water (DCCEEW). It now includes a lightweight persisted Grants and APP&B report structure plus code-level template mapping metadata, but it does not parse, store or generate XLSX workbooks yet.

## Product Shape

ROPES must support more than one APP&B workflow per organisation. The future model should allow:

- multiple grants per organisation
- multiple funders per organisation
- multiple funded programs per organisation
- multiple APP&B templates and template versions
- multiple reporting periods per grant
- annual planning, mid-year progress reporting and annual acquittal/final reporting cycles
- repeated workbooks for the same organisation when grants, funders or program types differ

APP&B reporting should sit across Reporting and Grants. Reporting owns workbook/profile/export surfaces. Grants now owns the first funder, program and reporting-period anchors; budgets, milestones, outputs and acquittals remain future work.

## Source Templates

The source-process references are:

- `APP&B - IRP, IPA and MDBIRR template - for 2025-26(3).xlsx`
- `NAC APP&B - IRP Round 1 of Expansion-2024-25.xlsx`
- `APP&B - IRP, IPA and MDBIRR template - 25-26 mid Year.xlsx`
- `2025-26 Annual Report July-June Raukkan EA ALT - 4-IQXOB1V.xlsx`

Future template inspection should identify major sheets, annual-planning tabs, mid-year/progress tabs, annual report/acquittal tabs, funder-standard fields, organisation-specific fields, grant/program-specific fields, reporting-period fields and stable cell/range mapping identifiers.

The current metadata now includes reviewed structural facts from local workbook inspection. The source workbook files remain external reference files and are not committed. The app still does not claim exact writable cells, named ranges or export-safe formula boundaries until those ranges are reviewed in a later scoped task.

## Capability Model

Relevant future capability keys:

- `reporting.appb`
- `reporting.funderTemplates`
- `grants.appb`
- `grants.progressReporting`

The keys are defined in the central capability registry, but they are not part of the default demo capability set. APP&B should stay disabled unless an organisation explicitly has the capability enabled. The seeded demo partner organisation explicitly enables them so reviewers can inspect the foundation.

Capability checks remain separate from tenant guards:

- Tenant guards decide whether the user can access the selected organisation.
- Capability checks decide whether APP&B reporting is enabled for that organisation.

## Current ROPES Data Fit

- `Organisation`: available for tenant identity and report scoping.
- `Project`: partial fit for project names, codes, dates and funding stream placeholders.
- `RangerProgram`: partial fit for program names, descriptions and regions.
- `Grant`: persisted fit for organisation-scoped funder, program type, funding agreement reference, status and funding period.
- `GrantReportingPeriod`: persisted fit for grant-scoped annual planning, mid-year progress and annual acquittal/reporting windows.
- `AppbReport`: persisted fit for repeated report instances, template profile/version placeholders and safe missing-data summaries.
- `Trip`: partial fit for activity timing, destination and purpose.
- `TripParticipant`: partial fit for people counts and activity participation context.
- `TripItineraryItem`: partial fit for scheduled activity narratives.
- `TripRiskAssessment`: partial fit for risk controls and journey-management evidence where relevant.
- `Vehicle`: partial fit where funder reporting asks for vehicle-supported operations.
- `FulcrumRecord`: partial fit for imported field evidence and activity records.
- `AuditLog`: available for future safe generation/export audit events.
- `OrganisationCapability`: available for optional feature enablement.

Missing future data includes budgets, milestones, outputs, acquittals, detailed report-specific manual fields and template mapping records.

## Verified Workbook Structure

Reviewed inspection output confirms these common workbook tabs:

- `Hide`
- `Report Type`
- `Project Plan & Activity Report`
- annual budget sheet, with year-specific names such as `2025-26 FY Annual Budget`
- `Expenditure Report`
- `Asset Register`

The 2025-26 annual planning and mid-year IRP/IPA/MDBIRR workbooks also include:

- `Wage Budget and Report`
- `Fee-for-Service Report`

The inspected annual report/acquittal workbook uses the smaller sheet set without wage or fee-for-service tabs.

Safe structural metadata in `lib/appb-reporting.ts` records sheet visibility, dimensions, non-empty cell counts, merged range counts, formula counts and protection detection signals. These are review aids only. A visible `Hide` sheet in one inspected workbook and missing protection metadata in the mid-year workbook are both treated as review signals, not export permissions.

Common verified sections now include:

- APP&B / report type setup
- version control and program selection
- project plan and activity report
- 12 month project plan
- annual budget / financial-year annual budget
- wage budget and employee data/demographics
- fee-for-service report
- expenditure report
- asset register and asset register instructions
- hidden lookup/reference content

Formula-heavy areas are represented as formula-protected placeholders. Manual-only placeholders cover report setup, free-text project/activity narrative, finance/acquittal, wage/personnel and asset-register areas. Repeatable table candidates cover project plan/activity rows, progress rows, budget line items, wage/FTE/demographic rows, fee-for-service rows, expenditure rows, asset register rows and hidden lookup/dropdown rows.

Exact cells and ranges remain marked `needs-range-review`, and all export-readiness checks remain blocked.

## Report Readiness Checklist

`lib/appb-readiness.ts` adds a readiness layer for each persisted `AppbReport` shown on `/reports/appb`.

For a selected organisation, grant, reporting period and APP&B report, the readiness summary:

- identifies the matching template version from `lib/appb-reporting.ts`
- checks required structured fields that ROPES already has, such as organisation, grant, reporting period and APP&B report metadata
- marks optional linked structured data such as Project and Ranger Program as present or missing
- marks future derived fields such as activity summaries and Fulcrum evidence as future data sources
- marks manual-only finance, wage/personnel, narrative and asset-register areas as manual required
- marks formula-protected placeholders as formula protected
- marks exact cell/range mappings as range-review required
- marks repeatable table candidates as range-review required or future data source
- always includes an export-blocked item

The UI shows only safe labels, statuses, counts, short reasons and next actions. It does not show finance values, personnel values, narrative values, raw workbook contents or generated workbook data.

Readiness statuses are:

- `ready`
- `missing-data`
- `manual-required`
- `range-review-required`
- `formula-protected`
- `future-data-source`
- `blocked`

Readiness categories are:

- `organisation`
- `grant`
- `reporting-period`
- `appb-report`
- `project`
- `ranger-program`
- `activity-summary`
- `fulcrum-evidence`
- `manual-finance`
- `manual-wage-personnel`
- `manual-narrative`
- `formula-protection`
- `repeatable-table`
- `export-readiness`

Manual-only readiness items can now use persisted `AppbManualFieldValue` records where they exist. A manual field marked `ENTERED`, `REVIEWED` or `NOT_APPLICABLE` can support readiness wording for that field, but export remains blocked by range review, formula protection and export-readiness checks.

## Manual Report Field Capture

`AppbManualFieldValue` stores report-only manual values scoped to:

- organisation
- grant
- grant reporting period
- APP&B report
- metadata field ID

Each value records a bounded status, field type and sensitivity:

- statuses: `BLANK`, `DRAFT`, `ENTERED`, `NEEDS_REVIEW`, `REVIEWED`, `NOT_APPLICABLE`
- sensitivities: `NORMAL`, `FINANCE`, `PERSONNEL`, `NARRATIVE`, `SENSITIVE`
- field types: `SHORT_TEXT`, `LONG_TEXT`, `NUMBER`, `CURRENCY`, `DATE`, `YES_NO`, `SELECT`, `ROW_GROUP_PLACEHOLDER`

Manual field values are not finance/accounting source-of-truth records, wage/personnel system-of-record records, workbook export mappings or range mappings. They support report readiness only.

The `/reports/appb` page shows compact manual-field status counts and field labels. It does not show stored finance, personnel, narrative, sensitive or workbook values in summary cards. Manual field editing is kept in an expandable report context with group cards, sensitivity/status badges and field-type-specific inputs:

- short text input for `SHORT_TEXT`
- textarea for `LONG_TEXT`
- number input for `NUMBER`
- currency-style number input for `CURRENCY`
- date input for `DATE`
- yes/no select for `YES_NO`
- select-style fallback for `SELECT`
- status-only placeholder controls for `ROW_GROUP_PLACEHOLDER`

The expandable editing context can load existing manual values for the selected
APP&B report so users can change status without accidentally clearing stored
report-only values. Compact report cards remain value-free. Status-only changes
preserve existing values and notes; choosing `BLANK` clears values and notes;
choosing `NOT_APPLICABLE` clears typed values while allowing a short safe note.
Finance, personnel, narrative and sensitive fields show editing warnings that
the values are report-only and are not source-of-truth records.

Manual field forms now include an explicit clear action that defaults to
preserving existing values. Users can intentionally replace a value, clear the
typed value, clear the note, clear both value and note, mark the field blank or
mark it not applicable. Destructive actions are labelled in the editing context;
compact summaries still show counts and statuses only.

The save flow is tenant-guarded, APP&B capability-gated and records safe audit metadata only: organisation, report, field ID, field group, sensitivity, status, clear mode and action type. Raw manual values are not written to audit metadata.

This foundation still does not add workbook export, XLSX generation, uploaded-template storage, mapping admin UI, finance/acquittal calculations, wage/personnel system-of-record features, AI calls or external integrations.

## Template Mapping Metadata

The code-level metadata in `lib/appb-reporting.ts` describes:

- `AppbTemplateProfile`: funder/program/cycle family such as NIAA IRP/IPA/MDBIRR.
- `AppbTemplateVersion`: one source workbook version for a profile and reporting cycle.
- `AppbWorkbookSheet`: expected sheet inventory with source confidence.
- `AppbTemplateSection`: logical section within a sheet.
- `AppbTemplateField`: required, manual, derived, structured or formula-protected field.
- `AppbTemplateMapping`: future stable connection between ROPES data and workbook cells/ranges.
- `AppbWorkbookRangeMapping`: exact cell/range metadata for one field or repeatable table target.
- `AppbWorkbookCellTarget`: single-cell, merged-cell anchor, named range, formula, hidden lookup or unsupported target.
- `AppbWorkbookRepeatableRange`: repeatable row/column target metadata that stays blocked until expansion rules are defined.
- `AppbRepeatableTable`: future repeatable rows such as activities, outputs or evidence.
- `AppbRepeatableRangeDefinition`: repeatable table metadata for header rows, data rows, formula rows, row identity and expansion rules.
- `AppbRepeatableColumnMapping`: future column mapping placeholder for repeatable rows.
- `AppbRepeatableHeaderRule` / `AppbRepeatableFormulaRowRule`: protected row rules for repeatable table areas.
- `AppbMappingReview`: value-free review metadata for field mappings and repeatable ranges.
- `AppbMappingReviewDecision`: safe decision labels for future review actions.
- `AppbMappingReviewSummary`: compact counts for review status, decision and target kind.
- `AppbManualField`: field that must remain manually entered until ROPES owns the data.
- `AppbExportReadinessCheck`: blocker or review check before export can be enabled.
- `AppbGeneratedWorkbook`: disabled placeholder for future safe export metadata.

Cell and range references support `needs-workbook-inspection` and `needs-range-review` discovery states. This lets ROPES represent a verified sheet or section without pretending to know a final A1 cell, named range, locked cell or protected formula boundary.

Exact range mapping metadata now distinguishes:

- single-cell structured fields
- manual report-only fields
- repeatable row/column range candidates
- formula-protected cells
- hidden lookup/reference sheet targets
- unsupported or export-blocked targets
- mappings that still need human review

Range mapping statuses include `unmapped`, `needs-review`, `reviewed`,
`blocked-formula`, `blocked-hidden-sheet`, `blocked-unsupported` and
`ready-for-future-export`. Readiness summaries only treat range review as
resolved when a mapping is `reviewed` or `ready-for-future-export`. Formula,
hidden-sheet, repeatable and unsupported mappings remain blocked or
review-required. Export remains blocked regardless of mapping status in this
foundation.

Repeatable table range metadata now distinguishes:

- candidate sheet, section and repeatable table ID
- source type such as manual, derived, future or Fulcrum-derived
- header rows that must be protected
- data rows that still need review
- total/formula rows that remain blocked
- row identity placeholders
- manual-only row groups that must not become structured export rows
- expansion rules such as `not-defined`, `fixed-row-count`, `append-rows`, `no-export-manual-only` and `blocked`

The current metadata does not claim exact row or column ranges. Repeatable table
readiness stays blocked or review-required until start/end rows, columns,
headers, formula rows and expansion behaviour are reviewed. Export remains
blocked regardless of repeatable metadata status in this foundation.

Mapping review workflow metadata now represents the human review layer for both
field mappings and repeatable range definitions. Report-scoped review decisions
can be persisted for a selected organisation, grant, reporting period and
APP&B report while remaining value-free and export-blocked.

Review metadata includes:

- target kind: field mapping or repeatable range
- review status, using the same conservative range statuses
- review decision, such as keep needs-review, mark reviewed, mark blocked
  formula, mark blocked hidden sheet, mark blocked unsupported, mark unmapped
  or mark ready for future export
- reviewer identity and reviewed timestamp for saved report-scoped decisions
- short safe review notes
- value-free audit metadata shape with template version, mapping ID, target
  kind, status and decision

The `/reports/appb` page shows compact review summaries and expandable
template-version review panels with labels, statuses, decisions and safe notes
only. Report-specific review panels include a small decision select, short
value-free note field and save button. They do not show workbook values or
manual report values. A persisted mapping marked reviewed or
ready-for-future-export can make readiness wording clearer, but workbook export
remains blocked until a separate export implementation exists.

Report-specific review panels also include a safe history section for each
mapping target. The history section shows the current persisted decision,
review status, reviewer display name, reviewed timestamp, target kind, target
ID, template version and stored safe note. It also shows compact value-free
decision-version events sorted with the most recently reviewed event first.
The current decision metadata is shown before the event list, including the
target label, kind and ID. The backend and UI share a three-event default: only
the three most recent value-free events are loaded for each target. A filtered
per-target count records how many older events were not loaded, and the local
load-more control requests one three-event page at a time for that target.
Loaded pages are appended below the default events while current decision
metadata stays separate. Creation events use `Current decision recorded`, while
update events use `Decision changed` and `Status changed` wording for
previous-to-new metadata. Value-free rejected note attempt counts remain a
separate section. The history view does not show raw audit logs, rejected unsafe
note text, workbook values or manual APP&B values.

Persisted mapping review decisions are stored in
`AppbMappingReviewDecisionRecord` and scoped to:

- organisation
- grant
- reporting period
- APP&B report
- template version
- target kind and target ID

`AppbMappingReviewDecisionHistoryRecord` is the append-only companion to the
current one-row-per-target record. The save action updates the current record
and appends its history event in one database transaction. Each history record
is organisation- and APP&B-report-scoped and stores only template and target
IDs, previous and new decision/status metadata, reviewer identity, reviewed
timestamp, an already-validated short safe note and `valueFree: true`. Reads
stay tenant-scoped and APP&B capability-gated through the report page, and the
read shape excludes records that are not explicitly marked value-free or do
not match the requested target and template version. The nested history query
is organisation-scoped, filters to `valueFree: true`, orders by reviewed and
created timestamp newest-first with a deterministic ID tie-break, and takes
only the shared default event limit. Its filtered relation count supplies
value-free older-event metadata; report-wide pagination remains intentionally
out of scope.

`loadOlderAppbMappingReviewHistoryAction` provides the small per-target
load-more path. Its request includes organisation slug, APP&B report ID, target
kind, target ID, template version ID and an HMAC-SHA-256-signed opaque cursor.
The versioned cursor payload contains only the last loaded history record's
reviewed timestamp, created timestamp and ID; the server-side signing secret is
never included. Before reading it:

- requires an authenticated active organisation membership
- confirms the APP&B report belongs to that organisation
- checks `reporting`, `reporting.appb`, `grants` and `grants.appb` capabilities
- resolves the organisation/report/target/current-decision/template scope
- verifies the cursor signature before accepting its value-free payload
- verifies the cursor anchor belongs to that exact value-free target history
- filters history by that decision relation, organisation, report, target,
  template version and `valueFree: true`

Each request returns at most three safely shaped events in stable newest-first
order, plus a value-free remaining count and next cursor when another page is
available. Cursor boundaries use reviewed timestamp, created timestamp and ID,
matching the query order so concurrent inserts do not shift later pages. It
returns no current decision record, rejected-note counts, raw
audit logs, workbook values, manual APP&B values or rejected unsafe note text.
Invalid signatures, unsupported versions and stale or mismatched anchors fail
with the same safe invalid-request response and do not expose target data.

Production deployments must configure a dedicated
`APPB_MAPPING_REVIEW_HISTORY_CURSOR_SECRET` of at least 32 UTF-8 bytes. When it
is absent or too short in production, the central runtime configuration check
raises a clear server-side error as the APP&B reporting overview loads. Cursor
creation and parsing also use the same validator and fail closed; errors and
client-visible responses never contain the secret. Every application instance
must use the same stable value. Rotating the value invalidates outstanding
cursors safely, and users can refresh the report to receive a newly signed
cursor.
Outside production only, ROPES creates a random process-local development
secret; cursors safely become stale when that process restarts. This fallback
is not exposed to the client and must not be used as production configuration.

The save action is tenant-guarded and APP&B capability-gated. Audit metadata
records safe IDs, target kind, decision, review status and note length only; it
does not record workbook values, manual APP&B values, finance values, personnel
values or narrative report text. Formula-protected, hidden-sheet and unsupported
targets keep conservative blocked decisions.

Mapping review notes also have a deterministic safety guardrail. Reviewers are
prompted to use short metadata-only notes such as range or template-structure
review comments. They must not enter workbook values, financial figures,
personal details, report narrative, private links or copied worksheet text.
The policy lives in `lib/appb-review-note-safety.ts` so it can be tested without
saving a mapping review decision.

Server-side validation rejects obvious unsafe patterns including:

- long pasted text or multi-line copied content
- currency amounts or detailed financial values
- phone numbers or email addresses
- likely secrets, tokens, API keys or credentials
- private URLs
- medical, personnel, wage or HR terms
- workbook cell references or formula-like content
- obvious person-name patterns tied to staff, employees, Rangers or participants

Rejected notes are not stored, logged, included in redirect URLs or written to
audit metadata. ROPES records only value-free rejection metadata such as note
length, target kind, target ID, template version ID and rejection reason code.
This is a basic deterministic guardrail, not full data-loss-prevention tooling,
and it does not use AI or external services.

The guardrail has a small deterministic test matrix covering allowed short
metadata notes and rejected fake examples for currency, contact details,
secrets, private URLs, workbook formulas/cell references, medical/personnel/wage
wording and copied narrative text. Future tuning should add or adjust explicit
test cases before changing the policy.

## Production Readiness Checklist

APP&B is ready to deploy only as the current review/history foundation. An
operator should complete every applicable item below before enabling it for an
organisation.

### Required configuration

- [ ] Set `DATABASE_URL` to the production PostgreSQL database and apply the
  committed migrations with `npm run db:deploy`.
- [ ] Set `NEXTAUTH_URL` to the canonical production application URL.
- [ ] Set a generated `NEXTAUTH_SECRET` and configure at least one supported
  OAuth provider. Do not rely on the fake/demo session fallback in production.
- [ ] Set `APPB_MAPPING_REVIEW_HISTORY_CURSOR_SECRET` to a dedicated secret of
  at least 32 UTF-8 bytes. Keep the same stable value on every app instance and
  never expose it to the client.
- [ ] Confirm the APP&B overview loads without a production cursor-secret
  configuration error. The random process-local cursor secret is a
  non-production fallback only.

### Tenant and capability access

- [ ] Confirm each authorised operator has a matching ROPES `User` record and
  an active membership for the selected organisation. Tenant guards must deny
  users without that organisation membership.
- [ ] Explicitly enable `reporting`, `reporting.appb`, `grants` and
  `grants.appb` for the organisation. Tenant membership and capability
  enablement are both required.
- [ ] Confirm grants, reporting periods, APP&B reports, manual values, mapping
  decisions and history rows all belong to the same organisation. Test that a
  user from another organisation cannot read or update them.
- [ ] Record how capabilities are provisioned operationally. A broad
  capability-administration UI is not part of this foundation.

### Safe-data checks

- [ ] Treat cursor payloads and review-history rows as value-free metadata
  only. They may contain safe IDs, decision/status metadata, reviewer identity,
  timestamps, validated safe notes and cursor ordering fields, but never
  workbook or manual APP&B values.
- [ ] Keep manual APP&B values confined to the authorised editing context.
  Status-only updates preserve stored values, and values or notes are removed
  only through the explicit clear controls.
- [ ] Keep deterministic review-note safety validation enabled. Rejected unsafe
  note text must not be stored, logged, returned in redirects or displayed;
  only value-free reason/count metadata may be retained.
- [ ] Keep current decisions, decision-version history and rejected-note reason
  counts as separate response and display sections. Do not expose raw audit
  logs through APP&B review history.
- [ ] Confirm audit metadata remains limited to safe IDs, statuses, counts,
  reason codes and note lengths rather than finance, personnel, narrative,
  workbook or manual report values.

### Operations and support

- [ ] Document ownership and rotation of the cursor secret. Rotation safely
  invalidates existing cursors; affected users should refresh the APP&B report
  to receive a cursor signed with the new shared value.
- [ ] Treat invalid, tampered, unsupported, stale or mismatched cursors as safe
  failures. They must not disclose whether another organisation or target has
  matching history.
- [ ] Confirm all app instances use the same database, authentication setup,
  capability configuration and cursor secret before scaling horizontally.
- [ ] Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`,
  `npx prisma validate` and `npm run db:generate` for the release candidate.

### Intentionally blocked or unsupported

- [ ] Acknowledge that workbook export remains blocked. ROPES does not generate
  XLSX files, write values into templates or claim export-safe cell/range
  mappings.
- [ ] Acknowledge that uploaded workbook template storage is not implemented.
- [ ] Acknowledge that full budget/acquittal logic, production workbook mapping,
  broad Grants workflows, bulk mapping administration and a broad audit-log
  browser remain unsupported.
- [ ] Confirm this APP&B foundation makes no AI provider calls and adds no
  APP&B-specific external services or live workbook integrations.

Completing this checklist supports deployment of APP&B manual-value,
mapping-review and value-free history foundations only. It does not authorise
workbook generation or export.

Initial metadata examples cover the known source workbook names for annual planning, mid-year progress and annual report/acquittal workflows. They are intentionally blocked for export until:

- exact named sections and repeatable table ranges are reviewed
- required cells and ranges are mapped
- formulas and protected/manual cells are confirmed
- manual-only finance/acquittal fields are reviewed
- mappings are checked against selected organisation, grant and reporting period scope

## Local Workbook Inspection

ROPES includes a developer-only workbook inspection script:

```bash
npm run appb:inspect -- --markdown --out docs/appb-inspections /path/to/workbook.xlsx
```

See `docs/appb-workbook-inspection.md` for the local workflow and review rules. The tool inspects local `.xlsx` files and outputs safe structural summaries with sheet names, dimensions, hidden sheet state, non-empty cell counts, likely labels, formulas, merged ranges, protection indicators where available, repeatable table candidates and mapping follow-up notes.

The script is intentionally separate from app runtime. It does not store uploaded templates, does not generate workbooks and does not make export safe by itself. Inspection output must be reviewed before committing.

## Future Data Concepts

The first persisted concepts are:

- `Grant`
- `GrantReportingPeriod`
- `AppbReport`

Likely future concepts:

- `GrantFunder`
- `GrantProgramType`
- `FunderTemplateProfile`
- `FunderTemplateVersion`
- `AppbWorkbookSheet`
- `AppbTemplateSection`
- `AppbTemplateField`
- `AppbReportSection`
- `AppbReportField`
- `AppbTemplateMapping`
- `AppbMappingReview`
- `AppbMappingReviewDecisionRecord`
- `AppbMappingReviewDecisionHistoryRecord`
- `AppbRepeatableTable`
- `AppbManualField`
- `AppbExportReadinessCheck`
- `AppbGeneratedWorkbook`

This PR intentionally does not add database schema for workbook sections, fields, generated workbook metadata, budget/acquittal records or finance logic.

## Future Workflow

Future behaviour should follow this shape:

1. Organisation has APP&B reporting enabled.
2. User creates or selects a grant.
3. User links the grant to funder, program type, funding period, projects and ranger programs.
4. User creates an APP&B report for one grant and reporting period.
5. User selects a funder template profile/version.
6. ROPES shows a read-only readiness checklist of required fields.
7. ROPES pre-fills available fields from structured Projects, Ranger Programs, Trips, Fulcrum records and future Grants data.
8. User fills manual values where ROPES does not own structured data yet.
9. ROPES blocks export until mapping readiness checks pass.
10. ROPES generates a draft workbook for review in a later export milestone.
11. ROPES records safe audit metadata for generation/export.

Future exports must not overwrite original templates. Generated reports must include only data for the selected organisation, grant and reporting period.

## Security

All APP&B data must remain organisation-scoped. Future grant/report/template-mapping records must validate selected organisation ownership, and generated workbook metadata must not leak data across organisations.

Audit metadata should avoid unnecessary financial detail, personnel detail and free-text report content. Store safe counts, IDs, selected profile/version keys, reporting period labels, review statuses, decision labels, note lengths and export result categories instead.

No credentials, live finance integrations, Google Calendar, Teams, email, SPOT integrations or AI calls are part of this planning foundation.
