# SPOT one-shot synchronisation (Slice 4)

This is a trusted Node command for one enabled SPOT integration. There is no HTTP endpoint, browser action, scheduler, retry loop or automatic pagination. Development and tests use invented credentials/messages, mocked HTTP and disposable PGlite. No live feed was accessed. Relates to #187.

## Verified provider contract and uncertainties

The [official SPOT API documentation](https://www.findmespot.com/en-us/support/spot-gen4/get-help/general/public-api-and-xml-feed) documents HTTPS host `api.findmespot.com`, path `/spot-main-web/consumer/rest-api/2.0/public/feed/<FEED_ID>/message.xml` (also `.json`), and optional `feedPassword` query authentication. Both feed identity and password are secrets.

Its XML example uses `response/feedMessageResponse`, `count`, and `messages/message`. Message fields include `id`, `messengerId`, `unixTime`, `messageType`, coordinates and `modelId`. The adapter uses integer Unix seconds as UTC; it does not guess a timezone or fall back to `dateTime`.

The [official Globalstar copy](https://www.globalstar.com/en-us/support-center/spot-for-business/spot-gen4/get-help/general/public-api-and-xml-feed) documents newest 50 messages by default, offsets `start=51`, `101`, and a maximum seven-day/feed-creation window. It specifies at least 2.5 minutes between requests to the same feed and two seconds between different feeds. Types include OK, TRACK, EXTREME-TRACK, UNLIMITED-TRACK, NEWMOVEMENT, HELP, HELP-CANCEL, CUSTOM, POI and STOP.

The published XML sample has inconsistent count/entry totals. We validate count and bound actual entries to 50, without inferring pagination from count. Empty messages require count zero. Nonempty count mismatches are tolerated.

Neither page defines a normative JSON envelope or a complete provider error schema. The command therefore uses XML. JSON parsing requires an explicitly injected, separately reviewed `SpotJsonProfile`; the JSON tests exercise a synthetic XML-equivalent mapping, not a verified live JSON contract. Non-success HTTP responses and non-feed XML envelopes fail with fixed codes; there is no guessed provider error-code mapping. Unsupported envelope variants fail closed pending review.

## Credentials and runtime permission

Only the existing opaque `TrackingIntegration.credentialKey` is stored. Keys must be canonical lowercase hyphen-separated tokens, at most 64 characters. `createEnvironmentCredentialResolver` maps them injectively to `ROPES_TRACKING_<UPPERCASE_KEY_WITH_UNDERSCORES>_FEED_ID` and optional `_FEED_PASSWORD`. Missing/invalid secrets fail closed. The resolver is injected so a future secret manager can replace the environment implementation. Credential objects redact JSON/inspection; raw exceptions, responses and request URLs are never logged or persisted.

Runtime permission requires all of:

- `ROPES_RUNTIME_ENV=sandbox`, a recognised `NODE_ENV`, and `ALLOW_SPOT_ONE_SHOT_SYNC=true`;
- `ROPES_SPOT_SYNC_ORGANISATION_ID` matching the explicit organisation argument;
- no enabled `ROPES_DEMO_MODE`, plus non-demo organisation and integration records;
- a matching owned, enabled SPOT integration and the existing `integrations.spotTracker` capability;
- the independent `--confirm-one-shot` flag and a mandatory trusted service authorizer.

The `NODE_ENV=production` build mode is allowed only alongside the sandbox runtime grant. This does not enable a production integration. No credential availability check enables an integration. Existing synthetic organisations/integrations and fixtures are unchanged and remain ineligible.

After a separately authorised configuration and credential process, the command shape is:

```sh
npm run tracking:spot:sync-once -- --organisation-id INTERNAL_ORG_ID --integration-id INTERNAL_INTEGRATION_ID --confirm-one-shot
```

This is documentation only; no such configured run was performed. Provisioning secrets or enabling a real integration requires separate review. Do not paste secret values into commands, logs, tracked environment examples or Compose. Opt-in `--discover-assets` permits creation of unknown messenger assets. Without it, an unknown messenger aborts the entire data batch. Optional `--start 51` selects exactly one later page under the same cooldown; it never loops.

## Network and parsing boundaries

The server-only adapter contains no Prisma writes. It constructs a fixed HTTPS host/path, disallows arbitrary origins, credentials in URL authority and unapproved query fields, and rejects redirects. It uses a ten-second deadline, abort signal and 256 KiB response limit (including streamed/decompressed bytes). Injectable limits have hard ceilings. XML uses `saxes` with DTD rejection, strict parse errors, depth/node limits and bounded input; no external entities are resolved.

Only allowlisted message fields survive parsing. Free text, messenger names and feed metadata are ignored. IDs, types and timestamps are validated; malformed messages are counted and skipped. An all-malformed page fails. Unknown types retain a bounded provider type and normalise to UNKNOWN. Invalid/absent coordinate pairs become null, retaining HELP-CANCEL as an event without a fix. Model metadata is bounded; literal credential reflections in retained string fields are rejected or discarded. Arbitrary provider payloads are never stored.

## Coordination and persistence

A short Read Committed transaction obtains the provider-wide PostgreSQL transaction advisory lock `(187, 4)`, rechecks authorisation data, reads database epoch time, and persists `lastPollAttemptAt` before any secret resolution or HTTP. PostgreSQL [transaction advisory locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS) coordinate processes using the same database and release with the transaction. No transaction remains open during HTTP.

Cooldown uses each previous SPOT integration attempt and `max(150, pollIntervalSeconds)` seconds; the existing default is 180. Failed attempts consume the cooldown. The deliberate provider-wide policy prevents alternate credential keys referencing the same secret feed from bypassing limits without storing a feed identifier/hash. It is stricter than required for different feeds: a long interval on any integration delays all SPOT integrations. It coordinates only this database, not other installations or external feed consumers. Rate-limited and busy commands return safe skip results.

A separate transaction rechecks ownership, enabled/demo/capability state, credential key and the attempt timestamp fence. Assets are resolved by integration plus messenger ID and never moved. Discovery creates a generic label; existing manual labels, source names, vehicle association, expected interval, model and retirement state are preserved (only a null model may be filled). No trip assignments are changed.

Message uniqueness uses the existing integration/external-message constraint. An identical duplicate is skipped; any identity/content conflict aborts the batch. Asset creation, metadata and message writes roll back together. Prior history and last success survive failure. Successful writes clear old error status; failures record only allowlisted codes and times, conditional on the attempt fence. The existing map read model still finds latest valid position independently from latest event.

The JSON summary contains internal integration ID, result/code, counts and last successful sync time. It excludes coordinates, provider IDs, raw messages, credential keys and secrets. Permission/argument failures return a fixed failure code; ordinary failures exit 1, successful/limited/busy attempts exit 0. There are no client DTO or public read-model changes.

## Validation and remaining review

`npm test` includes normal application tests plus `test:tracking-server`. The latter runs actual `server-only` modules with Node's `react-server` condition; ordinary Node imports remain rejected. `tracking-one-shot-boundary.test.ts` also executes the real CLI without confirmation to verify refusal before database/provider access and checks that app/components have no sync imports or automatic launch hook.

`tracking-server/spot-provider.test-server.ts` covers XML/explicit-profile JSON, malformed data, normalisation, invalid coordinates, secrets, request construction, redirects, errors, deadlines, streaming limits and UTF-8. `tracking-server/spot-sync.test-server.ts` migrates a disposable PGlite database and covers permission/tenant/demo/capability gates, discovery, idempotence, conflicts/rollback, failed-attempt cooldown, concurrent service clients, alternate credential aliases, status fencing and the command-to-Operations-Map read path. No accepted synthetic fixture is modified.

No schema change or migration is needed. Real PostgreSQL multi-process rehearsal, live provider compatibility and any real credential/deployment process remain separately authorised work. Tests simulate concurrent clients on PGlite, not separate operating-system PostgreSQL processes. JSON requires contract review before operational use. The current environment resolver is immediate; a future network secret-manager resolver needs its own deadline. Provider-wide throttling intentionally limits throughput. Existing npm audit findings were reported during installation; unrelated dependency upgrades are outside this slice.
