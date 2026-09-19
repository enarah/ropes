import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const workflowPath = ".github/workflows/release-artifact.yml";

function releaseWorkflow() {
  return readFileSync(workflowPath, "utf8");
}

function runBlocks(workflow: string) {
  const lines = workflow.split("\n");
  const blocks: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const match = /^(\s*)run:\s*\|/.exec(line);

    if (!match) {
      continue;
    }

    const runIndent = match[1].length;
    const blockLines: string[] = [];

    for (let blockIndex = index + 1; blockIndex < lines.length; blockIndex += 1) {
      const blockLine = lines[blockIndex];

      if (
        blockLine.trim() !== "" &&
        blockLine.search(/\S/) <= runIndent
      ) {
        break;
      }

      blockLines.push(blockLine);
    }

    blocks.push(blockLines.join("\n"));
  }

  return blocks;
}

function buildJobGlobalEnv(workflow: string) {
  const lines = workflow.split("\n");
  const stepsIndex = lines.findIndex((line) => line === "    steps:");

  assert.notEqual(stepsIndex, -1, "workflow should contain a build job steps block");

  let envIndex = -1;

  for (let index = stepsIndex - 1; index >= 0; index -= 1) {
    if (lines[index] === "    env:") {
      envIndex = index;
      break;
    }
  }

  assert.notEqual(envIndex, -1, "workflow should contain a build job env block");

  return lines.slice(envIndex + 1, stepsIndex).join("\n");
}

test("release artifact workflow keeps deployment-sensitive safety properties", () => {
  assert.equal(existsSync(workflowPath), true);

  const workflow = releaseWorkflow();

  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s*push:/m);
  assert.doesNotMatch(workflow, /^\s*schedule:/m);
  assert.doesNotMatch(workflow, /^\s*release:/m);
  assert.match(workflow, /runs-on:\s*ubuntu-24\.04/);
  assert.match(workflow, /node-version:\s*26/);
  assert.match(workflow, /npm_major=.*npm --version/);
  assert.match(workflow, /\[ "\$npm_major" != "11" \]/);
  assert.match(workflow, /\bnpm ci\b/);
  assert.doesNotMatch(workflow, /\bnpm install\b/);
  assert.doesNotMatch(workflow, /\bnpm run db:seed\b/);
  assert.doesNotMatch(workflow, /\bprisma migrate dev\b/);
  assert.doesNotMatch(workflow, /\bprisma db push\b/);
  assert.doesNotMatch(workflow, /\bssh\b/i);
  assert.doesNotMatch(workflow, /\bscp\b/i);
  assert.doesNotMatch(workflow, /\brsync\b/i);
  assert.doesNotMatch(workflow, /argus\.enarah/i);
  assert.doesNotMatch(workflow, /\$\{\{\s*secrets\./);
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*read/);
  assert.match(workflow, /retention-days:\s*30/);
  assert.match(workflow, /npm start -- --hostname 127\.0\.0\.1 --port "\$RELEASE_PORT"/);
  assert.match(workflow, /npm run db:deploy/);
  assert.match(workflow, /npm run provision:user -- --help/);
  assert.match(workflow, /ROPES-RELEASE\.json/);
  assert.match(workflow, /Check release artifact is environment neutral/);
  assert.match(workflow, /prisma\/schema\.prisma/);
  assert.match(workflow, /prisma\/migrations/);
  assert.match(workflow, /scripts\/provision-user\.ts/);
});

test("release artifact workflow does not expose runtime configuration at job scope", () => {
  const workflow = releaseWorkflow();
  const jobEnv = buildJobGlobalEnv(workflow);

  assert.match(jobEnv, /RELEASE_PORT:\s*"4387"/);

  for (const forbidden of [
    "DATABASE_URL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "NEXTAUTH_SECRET",
    "NEXTAUTH_URL",
    "ROPES_DEMO_MODE",
    "release-artifact-google-client-id",
    "release-artifact-google-client-secret",
    "release-artifact-nextauth-secret-for-ci-only",
    "postgresql://ropes_release_artifact@localhost:5432/ropes_release_artifact",
    "http://127.0.0.1:4387",
  ]) {
    assert.equal(
      jobEnv.includes(forbidden),
      false,
      `${forbidden} must not be configured at job scope`,
    );
  }
});

test("release artifact workflow does not interpolate manual input inside shell blocks", () => {
  const workflow = releaseWorkflow();

  assert.match(workflow, /EXPECTED_SHA:\s*\$\{\{\s*inputs\.expected_sha\s*\}\}/);
  assert.match(workflow, /\^\[0-9a-fA-F\]\{40\}\$/);

  for (const block of runBlocks(workflow)) {
    assert.equal(
      block.includes("${{ inputs.expected_sha }}"),
      false,
      "manual expected_sha input must be passed through env before shell use",
    );
  }
});
