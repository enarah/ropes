import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";

function sourceFiles(directory: URL): URL[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
    return entry.isDirectory() ? sourceFiles(path) : /\.[jt]sx?$/.test(entry.name) ? [path] : [];
  });
}
test("SPOT credential/provider/sync modules are server-only and have no public route or browser entry", () => {
  for (const name of ["credentials.ts", "sync.ts", "providers/spot.ts"]) {
    const source = readFileSync(new URL(`../lib/tracking/${name}`, import.meta.url), "utf8");
    assert.ok(source.startsWith('import "server-only";'));
  }
  const probe = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e",
    'import "./lib/tracking/credentials.ts"'], { cwd: new URL("../", import.meta.url), encoding: "utf8" });
  assert.notEqual(probe.status, 0);
  assert.match(probe.stderr, /cannot be imported from a Client Component/);
  for (const file of [...sourceFiles(new URL("../app/", import.meta.url)), ...sourceFiles(new URL("../components/", import.meta.url))]) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /tracking\/(?:sync|credentials|one-shot-command|providers\/spot)["']/);
  }
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(pkg.scripts["tracking:spot:sync-once"], /--conditions=react-server.*sync-spot-once/);
  for (const name of ["start", "dev", "build"]) assert.doesNotMatch(pkg.scripts[name], /sync-once|sync-spot|tracking:spot/);
});

test("actual CLI process refuses missing confirmation before any database/provider access", () => {
  const child = spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "scripts/sync-spot-once.ts",
    "--organisation-id", "synthetic-org", "--integration-id", "synthetic-integration"], {
    cwd: new URL("../", import.meta.url), encoding: "utf8", env: {
      PATH: process.env.PATH, DOTENV_CONFIG_PATH: "/dev/null", NODE_ENV: "test", ROPES_RUNTIME_ENV: "sandbox",
      ALLOW_SPOT_ONE_SHOT_SYNC: "true", ROPES_SPOT_SYNC_ORGANISATION_ID: "synthetic-org",
    },
  });
  assert.equal(child.status, 1);
  assert.deepEqual(JSON.parse(child.stdout.trim()), { result: "FAILED", code: "PERMISSION_DENIED" });
  assert.equal(child.stderr, "");
});
