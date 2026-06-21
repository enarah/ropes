# Fulcrum Integration Design

## Purpose

ROPES should treat Fulcrum as a first-class field data system. Many ranger programs already use Fulcrum for mobile data collection, so ROPES should connect to Fulcrum rather than trying to replace it.

Plain-language principle:

> Fulcrum remains the field data collection tool. ROPES becomes the operations, reporting, data quality and AI support layer around it.

## Fulcrum module navigation

- Overview
- Connections
- Apps & Forms
- Field Records
- Maps
- Data Health
- AI Assistant
- App Builder
- Sync Settings

## Connection model

Each organisation can connect its own Fulcrum account.

Requirements:

- One or more Fulcrum connections per organisation if needed.
- API credentials encrypted at rest.
- Raw credentials never displayed after save.
- Connection test action.
- Manual sync action.
- Sync logs and error messages.
- Organisation-scoped access only.

## Data to sync

### Apps and forms

Store Fulcrum app metadata so ROPES can show:

- app name
- description or purpose
- fields
- required fields
- dropdown options where available
- record count
- last synced time
- linked ROPES projects

### Records

Store records as raw JSON plus extracted common fields.

Common fields:

- Fulcrum record ID
- Fulcrum app ID
- organisation ID
- project ID if mapped
- trip ID if mapped
- created at
- updated at
- created by
- status
- latitude
- longitude
- geometry if available
- photo/media references
- raw JSON payload

### Media

Media should be represented as linked metadata first. Actual media download/storage can be added later.

## Data health checks

ROPES should help organisations improve data quality by flagging:

- missing GPS
- missing photos where expected
- missing required values
- duplicate-looking records
- records outside project area
- old records not linked to a project
- apps with low completion quality
- sync failures
- unusual values

## AI Assistant

The Fulcrum AI Assistant should answer questions using only records the user is allowed to access.

Example questions:

- What weed control work happened last month?
- Which sites need follow-up?
- Which records are missing photos?
- Summarise records for this trip.
- Draft a ranger activity report from these records.
- Which Fulcrum apps are being used most?
- Help design a new Fulcrum app for water point inspections.

Implementation stages:

1. Mock assistant that shows what it would search.
2. Deterministic summaries from synced records.
3. Real AI provider integration through an internal abstraction.
4. Source-linked answers back to ROPES records, trips and reports.

## App Builder

The App Builder should help staff design Fulcrum apps and forms.

Initial output should include:

- app purpose
- suggested field list
- field types
- required fields
- dropdown options
- conditional logic notes
- data quality checks
- reporting outputs

The first version should generate a design preview only. Direct creation or updating of Fulcrum apps can be added after the connector is stable.

## Security requirements

- Never expose one organisation's Fulcrum data to another organisation.
- Encrypt Fulcrum API tokens.
- Restrict Fulcrum setup to Organisation Admins and Enarah Admins with support access.
- Log connection tests, syncs, sync failures and credential updates.
- Treat restricted records carefully and apply the ROPES permissions model.

## Suggested data models

- FulcrumConnection
- FulcrumApp
- FulcrumField
- FulcrumRecord
- FulcrumMedia
- FulcrumSyncLog
- FulcrumProjectMapping
- FulcrumTripMapping

## Build stages

### Stage 1 — module shell

Build pages using demo data only.

### Stage 2 — connection manager

Save encrypted token, test connection and display connection status.

### Stage 3 — app sync

Sync Fulcrum apps/forms into ROPES.

### Stage 4 — record sync

Sync selected app records with logs and errors.

### Stage 5 — data health

Add quality checks and dashboard warnings.

### Stage 6 — AI assistant

Add permission-aware questions and report drafting.
