import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("database rehearsal workflow does not call destructive demo seed paths", () => {
  const workflow = readFileSync(
    ".github/workflows/database-rehearsal.yml",
    "utf8",
  );

  const forbiddenSeedCommand = ["db", "seed"].join(":");
  const forbiddenSeedFile = ["prisma", "seed.ts"].join("/");

  assert.equal(workflow.includes(forbiddenSeedCommand), false);
  assert.equal(workflow.includes(forbiddenSeedFile), false);
  assert.equal(workflow.includes("migrate dev"), false);
  assert.equal(workflow.includes("db push"), false);
});
