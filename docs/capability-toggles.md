# Organisation Modules and Capabilities

ROPES uses two separate checks for organisation-scoped features:

- Tenant access answers whether the signed-in user may access the selected organisation.
- Capability access answers whether that organisation has a module or feature enabled.

Capability checks must never replace tenant guards. Server routes and actions that read or write operational data still need the existing authenticated/session-aware tenant guard path first, then a capability check for feature-gated behaviour.

## Capability Foundation

Capabilities are stable string keys in `lib/capability-registry.ts`. Enabled capabilities are stored as organisation-scoped `OrganisationCapability` rows. The first implementation uses enabled rows only; absence means disabled.

Current proof helpers:

- `getOrganisationCapabilities`
- `organisationHasCapability`
- `requireOrganisationCapability`

UI checks hide unavailable navigation and links for convenience. Server pages and server actions enforce capability checks before loading or writing gated feature data.

## Initial Capability Groups

Trips:

- `trips`
- `trips.approvals`
- `trips.riskAssessment`
- `trips.journeyManagement`
- `trips.tripReports`
- `trips.pdfExport`

Vehicles:

- `vehicles`
- `vehicles.bookings`
- `vehicles.preStarts`
- `vehicles.defects`
- `vehicles.maintenance`

Future modules and integrations:

- `fulcrum`, `fulcrum.import`, `fulcrum.maps`
- `grants`, `grants.management`, `grants.acquittals`
- `grants.appb`, `grants.progressReporting`
- `reporting`, `reporting.appb`, `reporting.funderTemplates`
- `safety`
- `integrations`, `integrations.googleCalendar`, `integrations.spotTracker`, `integrations.teams`
- `branding`, `branding.customTheme`
- `ai`, `ai.assistant`, `ai.localProvider`, `ai.frontierProvider`

Vehicles remain owned by a single organisation. This capability model does not introduce shared vehicles, shared cross-organisation calendars, cross-organisation vehicle access or cross-organisation conflict checks.

## AI Provider Abstraction

AI is optional per organisation and off by default. Feature code should not call a provider directly. Future AI features should route through an internal provider interface that can resolve:

- no provider enabled
- local LLM provider
- frontier/cloud provider
- future provider types

This repository currently contains only safe placeholder types and availability helpers. There are no API keys, provider credentials, AI request execution paths or calls to OpenAI, Anthropic, Ollama, LM Studio or any other provider.

Future AI actions must be permission-aware and auditable. Audit metadata should use safe summaries, lengths, selected capability/provider type and result categories rather than full prompts, full retrieved context, secrets, credentials, medical notes or sensitive personal details.

## Future Attachment Points

Future milestones should plug into the capability registry before adding routes or server actions:

- Grants should be its own module, not mixed into Trips or Vehicles.
- APP&B reporting should be optional and grant/reporting-period scoped; do not
  assume one APP&B workbook per organisation.
- PDF export should be a shared document export capability reusable by Trips, Grants and Reporting.
- Emergency contacts and communication device registries should sit under Safety and be attachable to trip plans and journey outputs.
- SPOT/finder and Google Calendar should be optional integrations. ROPES remains the internal source of truth.
- Branding and login animation work should be treated as branding capabilities, not hard-coded for every deployment.

Admin UI for managing capabilities is intentionally deferred. Seed/demo data and migrations provide defaults for now.
