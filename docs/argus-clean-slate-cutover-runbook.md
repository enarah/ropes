# Argus clean-slate decommission and controlled ROPES cutover runbook

**PLANNING / REVIEW ONLY.**

This document does not authorise execution. It is the repository-side review
runbook for a later separately approved clean-slate decommission and controlled
ROPES cutover.

- Canonical Argus control hostname: `argus.enarah.com.au`
- ROPES application domain: `ropes.enarah.net.au`
- Hera operates from the sentinel machine and administers Argus remotely.
- Hera does not run on Argus.
- Parent decisions: #160, #171, #172
- Approved disposition: `CLEAN_SLATE_REPLACE`

Do not execute deletion, deployment, migration, provisioning, service changes,
proxy/DNS/TLS/firewall changes, database changes, secret rotation or Argus
changes from this document. Every destructive and deployment step below is a
future review item unless DC/Enarah separately authorises execution.

## 0. Authorisation / preflight

Before any destructive step, record a GO/NO-GO decision for every item.

| Gate | Required evidence | GO/NO-GO | Notes |
| --- | --- | --- | --- |
| Written execution approval | DC/Enarah approval for the specific run window and scope. |  |  |
| Exact Git SHA | Reviewed immutable commit selected. |  |  |
| Exact artifact identity | Release ID, source commit and artifact path/name selected. |  |  |
| Artifact checksum | Checksum recorded and independently verified. |  |  |
| CI status | Required repository validation is green for the selected commit. |  |  |
| Disposable PostgreSQL rehearsal | Latest relevant rehearsal status reviewed and accepted. |  |  |
| Linux x86_64 compatibility | Build/runtime platform compatibility verified. |  |  |
| Node/npm availability | Node 26 and npm 11 available for the reviewed runtime contract. |  |  |
| Capacity acceptance | Release, retained releases, logs, DB, backup, restore DB and free reserve budget accepted. |  |  |
| Maintenance/access boundary | Deny-by-default preparation state ready. |  |  |
| Destructive inventory | Exact old-state targets reviewed and approved for this run. |  |  |
| Old DB row counts | Old DB application row counts rechecked and still zero. |  |  |
| Shared-service check | No delete target belongs to another service. |  |  |
| Rollback/maintenance state | Safe withdrawal state ready before changes begin. |  |  |

Unexpected application data = **STOP**.

## 1. Enter maintenance / deny-access

Future execution must first enter the approved deny-by-default preparation
state. Do not prescribe or commit live IP addresses in this document. Use
approved placeholders until Enarah selects the exact boundary:

```text
<APPROVED_ADMIN_EGRESS_CIDR>
<APPROVED_IDENTITY_AWARE_GATE>
```

The intended state is:

- public users cannot reach the Node application;
- approved administrators/testers only can reach the preparation path;
- the current static Plesk page may remain until cutover is accepted;
- there is no demo fallback;
- the Node listener remains loopback-only;
- maintenance/static content is served until readiness and access are accepted.

## 2. Stop superseded runtime

Every command in this section is **FUTURE EXECUTION — NOT AUTHORISED BY THIS
PR**. Do not claim exact output in advance.

Reviewed command shapes for Hera to later execute:

```bash
sudo systemctl stop ropes.service
sudo systemctl disable ropes.service
sudo systemctl is-active ropes.service
sudo systemctl is-enabled ropes.service
sudo ss -ltnp | grep ':13060'
```

Required checks:

1. enter maintenance/deny-access;
2. stop old `ropes.service`;
3. verify the Node 24 process stopped;
4. verify port `13060` is free;
5. prevent automatic restart of the superseded service during decommission;
6. verify no process depends on files about to be removed.

If port `13060` is owned by an unexpected process = **STOP**.

## 3. Revalidate destructive inventory

Before deletion, every target needs a reviewed evidence row.

| Target | Expected owner/type | Dependency check | Delete approval | Result |
| --- | --- | --- | --- | --- |
| `/opt/ropes/current` | Symlink to superseded release | Resolve target before removal. |  |  |
| `/opt/ropes/releases/sentinel-2cd48e1` | Old ROPES release directory | No running process uses it. |  |  |
| `/etc/systemd/system/ropes.service` | Old ROPES service definition | Replacement/withdrawal path ready. |  |  |
| `/etc/ropes/production.env` | Old ROPES environment file | New environment prepared separately. |  |  |
| PostgreSQL DB `ropes` | Old ROPES DB | Exact DB name, sessions and app-row counts checked. |  |  |
| PostgreSQL DB `ropes_restore_sentinel` | Old restore/sentinel DB | Exact DB name, sessions and app-row counts checked. |  |  |
| `/var/backups/ropes/sentinel-initial.dump` | Old local ROPES dump | Exact file path and scope checked. |  |  |
| Historical ROPES-only remote backups | Clearly identified ROPES-only backups | Not a shared Argus/server backup. |  |  |

Shared or unrelated assets = **STOP**.

## 4. Remove old release/runtime state

Every command in this section is **FUTURE EXECUTION — NOT AUTHORISED BY THIS
PR**.

Safe ordering:

1. maintenance/deny-access is active;
2. old service is stopped and disabled;
3. Node 24 process is gone;
4. port `13060` is free;
5. symlink target is resolved and recorded;
6. exact reviewed target is removed;
7. result is verified before the next destructive step.

Reviewed command shapes:

```bash
readlink -f /opt/ropes/current
sudo rm /opt/ropes/current
sudo rm -rf /opt/ropes/releases/sentinel-2cd48e1
```

Do not delete `current` or the old release until the service is stopped and
port `13060` is free. Do not use broad destructive patterns or recursive
removal of parent directories. Deletion must name the exact reviewed target.

## 5. PostgreSQL clean slate

Before dropping anything:

- verify DB names exactly;
- verify zero unexpected sessions;
- verify zero application rows again;
- verify no other service connection;
- confirm the old DBs are not migration or rollback sources.

Future reviewed administrative SQL may include:

```sql
DROP DATABASE ropes;
DROP DATABASE ropes_restore_sentinel;
```

Those statements are **FUTURE EXECUTION — NOT AUTHORISED BY THIS PR** and only
apply after explicit execution approval.

Then create a NEW clean PostgreSQL 16 environment:

- loopback/private only;
- fresh credentials;
- separate migration/owner role and least-privilege runtime role where
  practical;
- runtime role is not DB superuser, role creator or DB creator;
- no old DB import;
- no historical dump restore.

Use placeholders in documentation and commands. Do not place actual passwords in
GitHub.

## 6. New release artifact

Target release layout:

```text
/opt/ropes/releases/<RELEASE_ID>
/opt/ropes/current -> /opt/ropes/releases/<RELEASE_ID>
```

Requirements:

- exact reviewed SHA;
- checksum;
- Linux x86_64 build;
- Node 26;
- npm 11;
- committed lockfile;
- recorded migration set;
- no `.git` requirement;
- no secrets;
- administrator ownership;
- read-only to runtime user;
- isolated writable `.next/cache`;
- atomic `current` switch only at the approved point.

Do not add a deployment archive or binary to the repository.

## 7. New environment/secrets

Document names only:

- `NODE_ENV`
- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- Google OAuth variables if selected
- `PORT` only if used
- optional `APPB_MAPPING_REVIEW_HISTORY_CURSOR_SECRET` only when APP&B is enabled

`ROPES_DEMO_MODE` must be unset or blank.

Old secret values must not be assumed reusable. Never place secret values in
GitHub, logs or PR comments.

## 8. Production migrations

Canonical future sequence:

```bash
npm run db:generate
npx prisma validate
npx prisma migrate status
npm run db:deploy
npx prisma migrate status
npm run db:deploy
npx prisma migrate status
```

Do not use:

- `prisma migrate dev`
- `prisma db push`
- `npm run db:seed`

No destructive demo seed.

## 9. systemd contract

This PR does not add or install a service file. Future service review should use
the Node 26/npm 11 environment and the canonical repository start command:

```text
npm start -- --hostname 127.0.0.1 --port 13060
```

Reviewable example only — **FUTURE EXECUTION, NOT INSTALLED BY THIS PR**:

```ini
[Service]
User=ropes
Group=ropes
WorkingDirectory=/opt/ropes/current
EnvironmentFile=/etc/ropes/production.env
Environment="PATH=/opt/plesk/node/26/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin"
ExecStart=/opt/plesk/node/26/bin/npm start -- --hostname 127.0.0.1 --port 13060
Restart=on-failure
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=/opt/ropes/current/.next/cache
```

Hera verified the intended Argus Node 26/npm 11 toolchain under
`/opt/plesk/node/26/bin/`, including Node at `/opt/plesk/node/26/bin/node` and
npm at `/opt/plesk/node/26/bin/npm`. Do not assume `/usr/bin/npm` selects the
reviewed runtime. Recheck the exact Node/npm patch versions immediately before
execution.

Preserve useful existing concepts where compatible:

- `User=ropes`
- `Group=ropes`
- `WorkingDirectory=/opt/ropes/current`
- `Restart=on-failure`
- `NoNewPrivileges=true`
- `PrivateTmp=true`
- `ProtectHome=true`
- `ProtectSystem=strict`
- restricted writable cache
- restricted capabilities

Do not blindly copy existing limits if they have not been operationally
accepted. Memory, CPU and task limits are Hera acceptance items.

Service startup must not:

- build;
- generate Prisma;
- migrate;
- seed;
- provision.

## 10. Reverse proxy / access gate

Future intended target:

```text
internet
→ Plesk-managed nginx
→ http://127.0.0.1:13060
```

This replaces the current static-root path only during separately authorised
cutover.

Document and accept:

- Plesk-managed TLS;
- canonical host;
- trusted forwarded headers;
- no arbitrary forwarding-header trust;
- Node loopback-only;
- deny-by-default outer gate;
- request-size policy;
- timeout policy.

No actual nginx config is added in this PR.

## 11. Start + readiness validation

Future validation checklist:

- Node 26 process;
- systemd active;
- loopback-only listener;
- `/api/health` HTTP 200;
- `/api/ready` HTTP 200;
- database `ok`;
- authentication `ok`;
- demo mode `ok`;
- no secret/raw error leakage.

Failure = remain maintenance/deny-access.

## 12. User provisioning

Canonical operator pathway:

```bash
npm run provision:user
```

Required flow:

1. dry-run;
2. human review;
3. explicit `--apply`;
4. targeted DB verification;
5. dry-run again for idempotence.

No seed. No auto-provision from OAuth.

Do not put real user provisioning commands with final role assignments in this
runbook yet because Daryl/Accounts roles remain undecided. Mabel may be
documented as intended `Enarah Admin`, subject to final execution approval.

## 13. Auth/tenant smoke testing

Checklist:

- approved account succeeds;
- unknown OAuth email denied;
- User without ACTIVE membership denied;
- INVITED denied;
- SUSPENDED denied;
- correct org permitted;
- cross-org denied;
- capability-disabled access denied;
- no demo fallback.

Use synthetic/minimal records only where possible.

## 14. NEW backup baseline

Future process:

- PostgreSQL custom-format dump;
- checksum;
- encrypted/off-server copy;
- verify remote readability;
- retention;
- RPO;
- backup-age monitoring.

Do not reuse the historical dump.

## 15. Isolated restore proof

Restore the NEW backup only into an isolated recovery DB. Never overwrite the
live DB.

Verify:

- restore completes;
- migrations;
- schema;
- safe synthetic readiness/access;
- elapsed recovery time.

Record RTO.

## 16. Rollback baseline

Before new release acceptance:

```text
rollback = maintenance/deny-access
```

Only after:

- new release validated;
- auth/tenant validated;
- new backup created;
- new isolated restore proven;

may the new release become the controlled baseline.

Old Node 24 release is never rollback.

## 17. Final cleanup verification

Checklist:

- no Node 24 ROPES process;
- no stale old service;
- old release removed;
- old symlink removed/replaced correctly;
- old DBs removed;
- old historical dump removed;
- approved historical ROPES-only backup copies removed;
- obsolete secret/config removed;
- unrelated services untouched.

## Runbook command safety rules

- No wildcard destructive commands.
- No recursive deletion of parent directories.
- Every deletion target is echoed/resolved first.
- Verify symlink target before removal.
- Verify DB name before `DROP`.
- Verify service name before disable/remove.
- One destructive step at a time.
- Verify result after each destructive step.
- STOP on unexpected output.
- Never print secrets.
- Never use `set -x` around secret-bearing commands.

## Evidence table

Do not pre-fill fake execution results.

| Phase | Gate/action | Owner | Expected result | Actual safe result | GO/NO-GO | Timestamp | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | Execution approval | DC/Enarah | Written approval recorded. |  |  |  |  |
| 1 | Maintenance/deny-access | Hera | Public app access denied except approved boundary. |  |  |  |  |
| 2 | Superseded runtime stopped | Hera | Old service stopped; port free. |  |  |  |  |
| 3 | Destructive inventory revalidated | Hera/DC | Exact objects approved; unrelated assets excluded. |  |  |  |  |
| 4 | Old runtime state removed | Hera | Exact old release/runtime objects removed. |  |  |  |  |
| 5 | Clean DB created | Hera | New DB and roles created; old DBs removed. |  |  |  |  |
| 6 | Release artifact staged | Hera/Codex | Reviewed artifact staged read-only. |  |  |  |  |
| 7 | Environment configured | Hera | New secrets/config in place without exposure. |  |  |  |  |
| 8 | Migrations deployed | Hera/Codex | Production migrations clean and idempotent. |  |  |  |  |
| 9 | Service installed | Hera | systemd contract accepted and active. |  |  |  |  |
| 10 | Proxy/access gate | Hera | Plesk route and deny-by-default gate accepted. |  |  |  |  |
| 11 | Health/readiness | Hera/Codex | `/api/health` and `/api/ready` pass safely. |  |  |  |  |
| 12 | Provisioning | Hera/DC | Approved users provisioned explicitly. |  |  |  |  |
| 13 | Auth/tenant smoke tests | DC/Mabel/Codex | Access grants and denials verified. |  |  |  |  |
| 14 | New backup baseline | Hera | New backup created, checksummed and copied. |  |  |  |  |
| 15 | Restore proof | Hera | Isolated restore proven. |  |  |  |  |
| 16 | Rollback baseline | DC/Hera | New rollback baseline accepted. |  |  |  |  |
| 17 | Final cleanup | Hera | Old ROPES-only state absent; unrelated assets untouched. |  |  |  |  |

## Ownership

- DC/Enarah — execution and rollback approval
- Hera — infrastructure execution from sentinel
- Codex/GitHub — repository artifacts/fixes
- Mabel — business/user coordination

Hera does not run on Argus.

## Parent issues

Keep #160 and #171 open.

This PR may close #172 only.
