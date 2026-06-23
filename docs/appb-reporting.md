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

The current metadata is conservative. The source workbook files are treated as business-process references by filename; the app does not claim exact sheet names, cell addresses, formulas or protected ranges until the workbooks are inspected in a later scoped task.

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

## Template Mapping Metadata

The code-level metadata in `lib/appb-reporting.ts` describes:

- `AppbTemplateProfile`: funder/program/cycle family such as NIAA IRP/IPA/MDBIRR.
- `AppbTemplateVersion`: one source workbook version for a profile and reporting cycle.
- `AppbWorkbookSheet`: expected sheet inventory with source confidence.
- `AppbTemplateSection`: logical section within a sheet.
- `AppbTemplateField`: required, manual, derived, structured or formula-protected field.
- `AppbTemplateMapping`: future stable connection between ROPES data and workbook cells/ranges.
- `AppbRepeatableTable`: future repeatable rows such as activities, outputs or evidence.
- `AppbManualField`: field that must remain manually entered until ROPES owns the data.
- `AppbExportReadinessCheck`: blocker or review check before export can be enabled.
- `AppbGeneratedWorkbook`: disabled placeholder for future safe export metadata.

Cell and range references support a `needs-workbook-inspection` discovery state. This lets ROPES represent a mapping target without pretending to know a final A1 cell, named range, locked cell or protected formula.

Initial metadata examples cover the known source workbook names for annual planning, mid-year progress and annual report/acquittal workflows. They are intentionally blocked for export until:

- the actual workbook tabs are inventoried
- named sections and repeatable tables are confirmed
- required cells and ranges are mapped
- formulas and protected/manual cells are identified
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
6. ROPES shows a mapping checklist of required fields.
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
