# Slice 4 real PostgreSQL review evidence

Review date: 2026-11-16. Baseline implementation: `be8e7ea79a615e88349da78f1fd230fd3f071623`, PR #195, issue #187. This follow-up adds tests, CI and documentation; it does not change the production sync implementation, dependency versions, schema, accepted fixtures or deployment configuration.

## Reproduction and isolation

Use Node 26, install the locked dependencies and generate Prisma Client. Provide a **disposable loopback-only PostgreSQL 16 server** with a role allowed to create/drop databases, then run:

```sh
ROPES_SPOT_REHEARSAL_ADMIN_URL=postgresql://ropes_rehearsal@127.0.0.1:55471/postgres npm run test:tracking-postgres
```

The URL above is an unauthenticated disposable local example, not a real credential. The harness refuses non-loopback URLs, query overrides and any server version outside PostgreSQL 16. It creates a randomly named database, applies the committed SQL migrations, creates its own synthetic records, and closes clients/drops the database on completion. It never queries existing application databases. Test SQL clock arithmetic explicitly uses UTC to match Prisma's timestamp-without-time-zone representation. No database clock or sync implementation is replaced.

Local execution used PostgreSQL **16.16** (server version number 160016) installed as native tooling, with an ephemeral cluster under `/tmp`, bound only to `127.0.0.1:55471`. No persistent service was started. The local cluster is stopped after validation. CI uses a disposable `postgres:16` service in `.github/workflows/spot-cli-rehearsal.yml` and publishes the safe test log as an artifact.

`tests/tracking-postgres/spot-cli.test-postgres.ts` launches the real `scripts/sync-spot-once.ts` with Node's `react-server` condition, separate PIDs and independent database pools. An IPC barrier releases two CLI processes together; it does not replace the CLI, authorizer, credential resolver, provider parser or sync service. Those run unchanged.

The test-only `mock-fetch.mjs` preload intercepts global fetch **after** the adapter has constructed/validated its approved HTTPS SPOT request. It accepts only the expected provider host/XML path and redirect policy, and forwards the call to a local HTTP server. The original secret-bearing URL is never forwarded. A synthetic Response hides the loopback transport URL from the production adapter, matching the existing injected transport contract. This deliberately mocks network/TLS, not PostgreSQL locking or application behaviour; it is not evidence of real SPOT/TLS interoperability. No production allowlist/configuration or HTTP entry point is added.

## Assertions

The suite contains eight subtests plus its parent:

1. **Held PostgreSQL advisory lock returns BUSY without HTTP or an attempt write.** A real transaction holds `(187,4)` while a CLI process runs. It returns BUSY, makes zero HTTP requests and leaves lastPollAttemptAt null. Committing releases the lock.
2. **Simultaneous independent CLI processes retrieve once; a fresh process sees durable cooldown.** Two distinct PIDs start together. One succeeds and exactly one request reaches the local mock; the other safely skips as BUSY/RATE_LIMITED. Another fresh CLI process skips without HTTP and leaves the durable attempt timestamp unchanged.
3. **Real elapsed success cooldown permits retry and identical messages are skipped.** The harness waits until the persisted timestamp plus 150 seconds expires, without changing it. A fresh CLI succeeds, skips four duplicates and leaves assets/messages unchanged.
4. **Failed provider attempt persists safely, blocks retry and succeeds after real elapsed cooldown.** Mock HTTP 503 contains synthetic secret canaries in its body. The CLI fails with only PROVIDER_ERROR, records the attempt/error and preserves last success/history. An immediate retry is blocked without HTTP. After another actual 150-second boundary, a fresh CLI succeeds and clears the error.
5. **Conflicting duplicate rolls back earlier asset/message writes and retains history.** A valid new asset/message precedes an identity conflict. The whole data transaction rolls back, reported insertion/discovery counts are zero, prior history/success remain, and the failed attempt consumes cooldown.
6. **Cross-organisation commands fail before HTTP; identical provider IDs remain independently scoped.** Mismatched integration/organisation/runtime grants fail without changing data or fetching. An authorised second organisation can ingest the same fake external message IDs into its own assets/messages; SQL verifies ownership joins and four messages per organisation.
7. **Newer durable attempt fences an in-flight CLI from overwriting messages or status.** The mock holds an HTTP response while test SQL creates a newer attempt/error. The old CLI returns ATTEMPT_SUPERSEDED, writes no messages and cannot clear the newer error.
8. **Captured process output and persisted diagnostics contain no credentials.** Every CLI stdout/stderr is checked for raw/encoded secret canaries, URLs, credential keys and coordinates. Stderr is empty and JSON summaries are bounded. Persisted diagnostic fields are checked too.

Independent scenarios use test SQL to age prior attempts only during setup, avoiding unnecessary waits between unrelated cases. The two explicit expiry assertions use actual elapsed time at the 150-second minimum; there is no shortened interval, fake clock or test-only bypass in the implementation. Default 180-second and configured interval behaviour remain covered by the existing server tests.

## Results and limits

The committed [PostgreSQL test log](evidence/spot-postgres-2026-11-16.txt) records the final successful local run, including real wait durations and mock request count. The normal application/server tests, typecheck, lint, production build, Prisma validation and diff check also pass. Dependency investigation and the exact current package/advisory inventory are in [the security review](spot-dependency-security-review.md).

Local validation: `npm test` passed 133 application tests and 23 server-only cases; `npm run test:tracking-postgres` passed 9 reported tests (parent plus 8 scenarios) in 305.1 seconds. The two actual expiry waits were 149,531 ms and 149,680 ms, measured after the immediate-retry assertions. Seven requests reached the loopback mock across all scenarios. `npm run db:generate`, `npm run typecheck`, `npm run lint`, `npm run build`, `npx prisma validate` and `git diff --check` passed. No dependency or lockfile change was needed.

The concurrency review requirement is covered using real PostgreSQL and real independent CLI processes. The PR is ready for **merge review**, with dependency-risk disposition still a reviewer decision. Keep it draft until that review is complete. No merge, deployment, TrueNAS/Argus access, real credentials or live SPOT call was performed. Existing provider-wide throughput limits, same-database coordination scope and unverified live JSON/provider compatibility remain unchanged. Current Next/sharp security findings require a separate authorised remediation before live-network deployment.
