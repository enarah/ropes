# APP&B Reporting Template Planning

APP&B reporting is planned as an optional Reporting / Grants capability. It must be enabled per organisation and must not become a global default.

This planning foundation covers Annual Project Plan and Budget templates used by major funders such as National Indigenous Australians Agency (NIAA) and Department of Climate Change, Energy, the Environment and Water (DCCEEW). It does not parse, store or generate XLSX workbooks yet.

## Product Shape

ROPES must support more than one APP&B workflow per organisation. The future model should allow:

- multiple grants per organisation
- multiple funders per organisation
- multiple funded programs per organisation
- multiple APP&B templates and template versions
- multiple reporting periods per grant
- annual planning, mid-year progress reporting and annual acquittal/final reporting cycles
- repeated workbooks for the same organisation when grants, funders or program types differ

APP&B reporting should sit across Reporting and future Grants. Reporting owns workbook/profile/export surfaces; Grants should eventually own funder, program, funding-period, budget, milestone, output and acquittal data.

## Source Templates

The source-process references are:

- `APP&B - IRP, IPA and MDBIRR template - for 2025-26(3).xlsx`
- `NAC APP&B - IRP Round 1 of Expansion-2024-25.xlsx`
- `APP&B - IRP, IPA and MDBIRR template - 25-26 mid Year.xlsx`
- `2025-26 Annual Report July-June Raukkan EA ALT - 4-IQXOB1V.xlsx`

Future template inspection should identify major sheets, annual-planning tabs, mid-year/progress tabs, annual report/acquittal tabs, funder-standard fields, organisation-specific fields, grant/program-specific fields, reporting-period fields and stable cell/range mapping identifiers.

## Capability Model

Relevant future capability keys:

- `reporting.appb`
- `reporting.funderTemplates`
- `grants.appb`
- `grants.progressReporting`

The keys are defined in the central capability registry, but they are not part of the default demo capability set. APP&B should stay disabled unless an organisation explicitly has the capability enabled.

Capability checks remain separate from tenant guards:

- Tenant guards decide whether the user can access the selected organisation.
- Capability checks decide whether APP&B reporting is enabled for that organisation.

## Current ROPES Data Fit

- `Organisation`: available for tenant identity and report scoping.
- `Project`: partial fit for project names, codes, dates and funding stream placeholders.
- `RangerProgram`: partial fit for program names, descriptions and regions.
- `Trip`: partial fit for activity timing, destination and purpose.
- `TripParticipant`: partial fit for people counts and activity participation context.
- `TripItineraryItem`: partial fit for scheduled activity narratives.
- `TripRiskAssessment`: partial fit for risk controls and journey-management evidence where relevant.
- `Vehicle`: partial fit where funder reporting asks for vehicle-supported operations.
- `FulcrumRecord`: partial fit for imported field evidence and activity records.
- `AuditLog`: available for future safe generation/export audit events.
- `OrganisationCapability`: available for optional feature enablement.

Missing future data includes grant agreements, funders, program types, funding periods, budgets, milestones, outputs, acquittals, report-specific manual fields and template mapping records.

## Future Data Concepts

Likely future concepts:

- `Grant`
- `GrantFunder`
- `GrantProgramType`
- `GrantReportingPeriod`
- `FunderTemplateProfile`
- `FunderTemplateVersion`
- `AppbReport`
- `AppbReportSection`
- `AppbReportField`
- `AppbTemplateMapping`
- `AppbGeneratedWorkbook`

These are planning concepts only. This PR intentionally does not add schema for them.

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
9. ROPES generates a draft workbook for review in a later export milestone.
10. ROPES records safe audit metadata for generation/export.

Future exports must not overwrite original templates. Generated reports must include only data for the selected organisation, grant and reporting period.

## Security

All APP&B data must remain organisation-scoped. Future grant/report/template-mapping records must validate selected organisation ownership, and generated workbook metadata must not leak data across organisations.

Audit metadata should avoid unnecessary financial detail, personnel detail and free-text report content. Store safe counts, IDs, selected profile/version keys, reporting period labels and export result categories instead.

No credentials, live finance integrations, Google Calendar, Teams, email, SPOT integrations or AI calls are part of this planning foundation.
