# ROPES Operations & Assurance: post-SPOT implementation plan

Status: **proposal only — not authorised for implementation/deployment**  
Baseline: `sandbox/truenas` after PR #196; SPOT #187 and slices #193–195 remain the prerequisite.  
Scope: two modes: (1) organisation directly delivering ranger field operations, and (2) an explicitly authorised provider managing services for a client Aboriginal organisation.  
Purpose: practical ISO-aligned evidence for ISO 45001 (WHS), ISO 9001 (quality) and ISO 14001 (environment). ROPES **does not confer ISO certification**.

## Non-negotiable architecture
- Preserve multi-organisation isolation, existing Auth.js membership checks, explicit capability toggles, demo/live fail-closed boundaries, current 19 migrations, database data, and rollback controls.
- Do not assume a provider's membership grants access to a client's records. Introduce narrow, time-bounded, revocable `ServiceEngagement` permissions authorised by the client organisation; authority is per project and action and cannot grant membership or ownership. A client's own admin controls approvals and revocation.
- Distinguish `owningOrganisationId`, `deliveryOrganisationId` and `actingUserId`; retain the client owner on every record. Do not bypass row-level tenant ownership via provider relationships or export.
- Cultural authority is not an ISO checkbox. Record permission status, responsible authority, date, constraints and expiry with least-privilege access. Do not store sacred/restricted cultural content or location details in broadly accessible assurance records. Inherited client data stays client-owned.
- No automated operational safety approval, emergency escalation, cultural clearance, qualification equivalence or certification claim. Human authority and signed approvals are mandatory.
- Prefer structured fields and controlled reason codes; never replicate health details, sensitive coordinates, ICIP, SPOT credential material or raw tracker responses into audit evidence, notifications or logs.
- Offline-first field usability is a later separately reviewed slice; do not assert offline readiness until local data protection, conflict resolution and synchronisation are tested.
- Reuse existing Trip, TripRiskAssessment, TripApprovalNote, Vehicle, VehiclePreStartChecklist, VehicleDefect, VehicleMaintenanceRecord, TrackingAssignment, Project, Grant and AuditLog, rather than duplicate them.

## End-to-end process
1. Plan/authorise: service engagement (if applicable), project/work order, scope and funds, cultural-access status, owner/delegations, risk assessment, trip approval.
2. Readiness: competent people, required inductions, vehicle defects/prestarts, equipment, communications, rescue plan, approved control documents.
3. Execute: trip status, SPOT-derived asset position (read-only, freshness labelled), daily check-in and field observations; no location-based automatic safety conclusion.
4. Close: work completed, exceptions, incidents, corrective actions, client acceptance, restricted evidence links, required reports.
5. Improve: incident trends, overdue corrective actions, management-review actions, audit sampling, findings and close-out.

## Sequential implementation slices (separate small PRs)
### OA-0 — discovery and data/permissions threat model
Inventory existing schemas/routes/roles/capabilities, required record types, client/provider legal delegation, storage/export, and ISO control mapping. Document permission matrix and threat model before schema work. No application behaviour change.

### OA-1 — assurance foundation
New optional module `operations.assurance`, disabled by default per organisation. Versioned control register, controlled document metadata, review/expiry owners, corrective-action lifecycle with immutable history, management review register; non-sensitive references to existing evidence. New schema is additive with reversible migration rehearsal; no retrospective destructive changes. Server-side tenant checks and tests for every write.

### OA-2 — managed-service engagement
Client-created, explicitly accepted and revocable `ServiceEngagement`: clientId, providerId, project scope, allowed action set, start/end, approving client actor, audit timestamps, status. Require both membership in provider organisation and active engagement for scoped operations; deny access to cultural/restricted data by default. Test no engagement, expired, revoked, wrong project, inactive membership, cross-client, demo/live, inferred roles.

### OA-3 — work orders and approval gates
Approved scope, deliverables, funding allocation references (not financial ledger), client decision delegation, work order stages, cultural approval metadata, trip linkage. Separate client authorisation from delivery approval. Block dispatch when required approvals missing; never alter existing Trip approval semantics without compatibility tests.

### OA-4 — workforce and plant readiness
Competency/qualification registry with validation/expiry and approving officer; required task competencies; asset checks and equipment maintenance linked to vehicles/trips. Readiness summary must show unknown or expired as needs-review rather than safe. Do not store diagnoses or unrestricted medical notes.

### OA-5 — incident and action management
Hazard, near miss, incident, corrective actions and closeout; restricted attachments; escalation rules and human ownership; retain evidence of notification without sending automatic emergency alerts. Avoid sensitive incident information in broad dashboards.

### OA-6 — field closeout and environmental evidence
Link existing trip, Fulcrum and SPOT artefacts to job outcomes by immutable, access-checked references. Map selected ISO control objectives to attributable evidence; retain provenance and timestamps; support gaps/unknowns, not false green statuses. Simple accessible, mobile first field screens.

### OA-7 — management review and audit export
Organisation-level and engagement-scoped dashboards, overdue/unknown indicators, independent auditor read-only role if authorised, scoped evidence export with redaction, expiry and access logging. Explicitly distinguish implementation evidence from accredited ISO certification.

### OA-8 — offline & deployment hardening
Separately design encrypted local cache, queue, conflict handling, device-loss/revocation, sync integrity and limited offline data scope. Threat model before enabling; do not expose restricted cultural data or SPOT credentials offline. Add mobile/browser acceptance and field usability testing.

## Proposed data relationships
- `AssuranceControl` — tenant-owned control / version / responsible role / review due.
- `ControlledDocument` — metadata, version, owner, approval state, restricted link; no uncontrolled file blobs.
- `CorrectiveAction` & `CorrectiveActionEvent` — actor, owner, due, status, immutable transitions, relevant evidence refs.
- `ServiceEngagement` & `ServiceEngagementPermission` — client owner/provider/approved scope and revocation.
- `WorkOrder` & `WorkOrderApproval` — client approval versus provider execution, linked Project/Trip.
- `CompetencyRecord` & `AssetReadinessRequirement` — requirements and verified expiries.
- `IncidentRecord` — restricted audience, separate disclosure policies and corrective actions.
- `EvidenceLink` — typed server-validated reference to existing tenant-owned Trip/Vehicle/Fulcrum/Tracking records; provenance and viewer checks at access time.
Names are conceptual until OA-0 verifies existing schema conventions.

## Test/acceptance criteria for each slice
- Same required gated checks as existing ROPES: Prisma generation/validation, migration checks where relevant, application/server tests, PostgreSQL concurrency rehearsal for new races, typecheck, lint, production build, diff check and applicable CI.
- Test direct-operator and managed-provider flows separately; ensure an engagement never grants owner-level powers.
- Verify revoked/expired provider access fails immediately at server action, query, export and evidence dereference.
- Test unknown/expired competence or prestart as blocked/needs review, never implicitly authorised.
- Test synthetic non-sensitive data only, deterministic demo fixtures; no real ranger, incident, client, tracking or cultural information.
- Check audit-event immutability and restricted-field exclusion from API responses/logs.
- Verify screen-reader and mobile usability; offline not promised before OA-8.
- No automatic merges, sandbox rollout, Argus deployment, secret configuration or live SPOT polling. Separate review/approval and deployment handoff with rollback and existing database preservation.

## Dependencies & go/no-go
Proceed only once SPOT lifecycle has documented controlled deployment and browser acceptance, and a specific owner signs off client/provider authority rules, cultural data classification and ISO control crosswalk. OA-0 and docs can be reviewed before this gate, but implementation branches must not be merged solely because planning is approved.

## Pilot
Use fake/sample direct operator and managed client/provider pairs in isolated demo, then seek separately authorised pilots with consenting real organisations. Pilot workflow: approved work order → risk assessment and trip → prestart & competency → SPOT visibility → field check-in → closeout → corrective action → management review → audit evidence. Measure duplicated entry, task completion, approvals, overdue actions and permission-denial correctness.

## Business / standards boundary
ISO standards guide processes; independent accredited certification is separate. The certified legal entity, scope and sites should be agreed after the DSS/Enarah restructure; no implication that any client organisation or ranger program inherits certification.
