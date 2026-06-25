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
- `AppbRepeatableTable`
- `AppbManualField`
- `AppbExportReadinessCheck`
- `AppbGeneratedWorkbook`

This PR intentionally does not add database schema for workbook sections, fields, mappings, generated workbook metadata, budget/acquittal records or finance logic.

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

Audit metadata should avoid unnecessary financial detail, personnel detail and free-text report content. Store safe counts, IDs, selected profile/version keys, reporting period labels and export result categories instead.

No credentials, live finance integrations, Google Calendar, Teams, email, SPOT integrations or AI calls are part of this planning foundation.
