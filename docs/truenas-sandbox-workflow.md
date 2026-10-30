# TrueNAS ROPES Sandbox Workflow

## Purpose

The TrueNAS ROPES deployment is the integration and experimentation environment for substantial ROPES changes.

It is intentionally separate from the controlled Argus/release path.

## Branch roles

- `main` — controlled release line. Changes here are candidates for future Argus deployment only after normal review, CI, operational preflight, and explicit deployment approval.
- `sandbox/truenas` — long-lived integration branch deployed to the TrueNAS ROPES sandbox.
- `experiment/*`, `feature/*`, `agent/*` — short-lived work branches for substantial changes. Prefer branching from `sandbox/truenas` when work depends on other sandbox-only changes.

## Sandbox rules

1. Use fake/synthetic data only.
2. Do not use production Argus secrets, credentials, databases, backups, or customer operational data.
3. Do not point sandbox services at Argus.
4. Keep PostgreSQL private to the sandbox network.
5. Keep sandbox access restricted to the trusted LAN/VPN unless a separate access decision is made.
6. Never run the destructive demo seed unless the target is the disposable `ropes_demo` database and the repository safeguards permit it.
7. Snapshot or otherwise preserve the sandbox database before schema-changing experiments where useful.
8. Treat the sandbox as disposable. It is not a production recovery baseline.

## Development workflow

1. Create a work branch from `sandbox/truenas`.
2. Make the experiment or feature changes.
3. Open a PR targeting `sandbox/truenas`.
4. Require PR validation to pass.
5. Merge the PR into `sandbox/truenas`.
6. Update the TrueNAS sandbox from `sandbox/truenas`.
7. Run migrations explicitly if required.
8. Do not reseed unless an intentional demo-data reset is required.
9. Perform functional testing on the TrueNAS sandbox.
10. Record whether the change is accepted, needs revision, or should be abandoned.

## Promotion to main

Do not assume that everything accumulated in `sandbox/truenas` should move to `main`.

For a successful experiment:

- identify the exact commits/PR that represent the accepted change;
- create a clean promotion branch from current `main`;
- cherry-pick or re-implement only the accepted change set;
- open a normal PR to `main`;
- run the full repository validation and any feature-specific tests;
- keep Argus deployment as a separate operational decision.

This keeps unsuccessful or unfinished sandbox experiments out of the controlled release line.

## TrueNAS deployment baseline

The sandbox was initially proven on TrueNAS 25.10.7 with:

- application port `13061`;
- PostgreSQL 16;
- isolated demo database `ropes_demo`;
- ROPES demo mode enabled;
- private PostgreSQL networking;
- LAN-only application exposure;
- explicit migration and seed stages.

Machine-specific TrueNAS configuration should remain local to the server unless it is deliberately generalized and reviewed for inclusion in the repository.
