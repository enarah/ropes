# Next.js and sharp security remediation

Prepared separately after PR #195 merged into `sandbox/truenas` as `e37820640b020c051f2e04f7ddb07db0a0ece99a`. Date: 2026-11-16. Branch: `fix/next-sharp-security`.

## Dependency change and rationale

| Dependency | Merged baseline | Remediation |
| --- | --- | --- |
| next | 16.3.4 | 16.4.6 |
| sharp | 0.35.4, optional/transitive | 0.35.5, explicit runtime dependency |
| eslint-config-next | 16.2.9 | 16.4.6, aligned with Next |

These versions are pinned exactly in `package.json` and resolved in the lockfile. Explicit sharp makes the reviewed runtime floor part of our manifest rather than relying solely on Next's optional transitive range. `npm ls next sharp eslint-config-next --all` confirms a single deduplicated copy of each target. Lockfile version changes are confined to these families, their native SWC/sharp binaries, Next env/lint packages and sharp's libvips packages; no unrelated dependency family was refreshed or automatically fixed.

The [Next 16.4.1 security release](https://github.com/vercel/next.js/releases/tag/v16.4.1) fixes conditional RCE in typed-array `use cache` and SVG image optimisation, plus the Server Actions DoS whose preconditions match ROPES. [Next 16.4.6](https://github.com/vercel/next.js/releases/tag/v16.4.6) is the current stable 16.x patch verified from official release/registry metadata during this change; it stays within the current major and includes later backported fixes. React 19.2.7 remains within Next's documented package peer range.

[sharp 0.35.5](https://github.com/lovell/sharp/releases/tag/v0.35.5) is the patched version recommended by [the maintainer advisory](https://github.com/advisories/GHSA-wq5f-xc86-pv6w). Its updated prebuilt libvips dependency includes librsvg 2.63.2. The local native runtime reports sharp 0.35.5, libvips 8.18.7 and librsvg 2.63.2. Nothing depends on a platform-specific local override or a security-advisory suppression.

## Audit comparison

| npm audit | Before | After |
| --- | --- | --- |
| All dependencies | 22: 11 moderate, 10 high, 1 critical | 20: 11 moderate, 9 high, **0 critical** |
| Omit development dependencies | 8: 1 moderate, 6 high, 1 critical | 6: 1 moderate, 5 high, **0 critical** |
| next/sharp entries | Both affected | Neither reported |

The [comparison snapshot](evidence/next-sharp-security-audit-2026-11-16.json) records versions, lock hash, counts and all remaining affected packages. Historical advisory details/reachability classification remain in [the original review](spot-dependency-security-review.md) and its complete advisory inventory. These counts are registry snapshots, not a guarantee against future advisories.

Remaining findings include Prisma maintenance tooling (`prisma`, `@prisma/config`, `deepmerge-ts`, `mysql2`, `fast-uri`), shared PostCSS `source-map-js`, lint/glob/CSS tooling and ExcelJS/uuid. Some tooling is physically included by the existing image's unrestricted npm installation, even where no vulnerable request-processing operation is identified. This scoped PR does not claim the whole dependency tree is clean. No `npm audit fix`, Prisma major upgrade, workbook downgrade or unrelated transitive override was applied.

## Regression validation

The merged commit was validated before dependency changes: Prisma generation, 133 application tests and 23 server-only cases, typecheck, lint, production build, Prisma schema validation and diff checks passed. Its tree matched the reviewed head. [Post-merge sandbox CI](https://github.com/enarah/ropes/actions/runs/43808234381) passed as well.

With the patched dependencies:

- Prisma generation, **134 application tests and 23 server-only cases**, typecheck, lint, production build, Prisma validation and diff checks pass.
- New `tests/sharp-runtime.test.ts` loads the native module, decodes a trusted in-memory SVG, resizes/encodes PNG, then checks dimensions and decoded pixel values. This exercises native binary loading and image processing rather than merely checking version strings. It does not attempt exploitation or accept external content.
- The actual SPOT one-shot CLI's **PostgreSQL 16 two-process rehearsal** passes all 9 reported tests (parent plus 8 scenarios), retaining real cooldown waits, isolation, rollback, idempotence, fencing and redaction assertions. [Successful run evidence](evidence/next-sharp-postgres-2026-11-16.txt) is committed.
- A loopback-only compiled-runtime smoke test checks `/api/health` returns 200, `/api/ready` returns safe unconfigured 503, and home, Trips, new Trip and Vehicles render their fail-closed access state without runtime exceptions. Database/authentication are unset and SPOT sync explicitly disabled. Authenticated database readiness/provisioning and migration regression are also exercised by the existing disposable CI rehearsal.
- PR CI repeats application/native tests, production build, migration/provisioning/readiness rehearsal and independent SPOT CLI PostgreSQL coordination on Linux; results are linked in the PR.

No application/UI, tracking domain, sync implementation, schema, fixtures, authentication configuration, polling or deployment behaviour is changed. Tests use synthetic inputs, loopback HTTP and disposable PostgreSQL only. No live SPOT, TrueNAS or Argus access occurred. This remediation PR must be separately reviewed before any live-network deployment; preparing it does not authorise merging or deploying it. Remaining dependency findings still need their own risk disposition/remediation.
