import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const workflowPath = ".github/workflows/almalinux-artifact-compatibility.yml";

function compatibilityWorkflow() {
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

test("AlmaLinux compatibility workflow keeps CI-only safety boundaries", () => {
  assert.equal(existsSync(workflowPath), true);

  const workflow = compatibilityWorkflow();

  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^\s*push:/m);
  assert.doesNotMatch(workflow, /^\s*schedule:/m);
  assert.doesNotMatch(workflow, /^\s*release:/m);
  assert.match(workflow, /permissions:\s*\n\s*contents:\s*read\n\s*actions:\s*read/);
  assert.match(workflow, /runs-on:\s*ubuntu-24\.04/);
  assert.match(workflow, /image:\s*almalinux:9\.8/);
  assert.match(workflow, /POSTGRES_HOST_AUTH_METHOD:\s*trust/);
  assert.match(workflow, /NODE_VERSION:\s*"26\.9\.0"/);
  assert.match(workflow, /SHASUMS256\.txt/);
  assert.match(workflow, /sha256sum -c node-linux-x64\.sha256/);
  assert.match(workflow, /getconf GNU_LIBC_VERSION/);
  assert.match(workflow, /\[ "\$glibc_version" != "glibc 2\.34" \]/);
  assert.match(workflow, /npm_major=.*npm.*--version/);
  assert.match(workflow, /\[ "\$npm_major" != "11" \]/);
  assert.match(workflow, /npm run db:generate/);
  assert.match(workflow, /npx prisma validate/);
  assert.match(workflow, /npm run db:deploy/);
  assert.match(workflow, /npm run provision:user -- --help/);
  assert.match(workflow, /Prove as-shipped liveness before Prisma generation/);
  assert.match(workflow, /npm start -- --hostname 127\.0\.0\.1 --port "\$AS_SHIPPED_PORT"/);
  assert.match(workflow, /ropes-almalinux-as-shipped-health\.json/);
  assert.match(workflow, /npm start -- --hostname 127\.0\.0\.1 --port "\$COMPAT_PORT"/);
  assert.match(workflow, /\/api\/health/);
  assert.match(workflow, /\/api\/ready/);
  assert.match(workflow, /readelf -V/);
  assert.match(workflow, /\bldd "\$elf"/);
  assert.match(workflow, /not found/);
  assert.match(workflow, /GLIBC_2\.34/);
  assert.match(workflow, /uses:\s*actions\/download-artifact@v4/);
  assert.match(workflow, /repository:\s*enarah\/ropes/);
  assert.match(workflow, /run-id:\s*\$\{\{\s*env\.ARTIFACT_RUN_ID\s*\}\}/);
  assert.match(workflow, /name:\s*\$\{\{\s*env\.ARTIFACT_NAME\s*\}\}/);
  assert.match(workflow, /github-token:\s*\$\{\{\s*github\.token\s*\}\}/);
  assert.doesNotMatch(workflow, /\bnpm ci\b/);
  assert.doesNotMatch(workflow, /\bnpm install\b/);
  assert.doesNotMatch(workflow, /\bnpm run build\b/);
  assert.doesNotMatch(workflow, /\bnpm run db:seed\b/);
  assert.doesNotMatch(workflow, /\bprisma migrate dev\b/);
  assert.doesNotMatch(workflow, /\bprisma db push\b/);
  assert.doesNotMatch(workflow, /\bssh\b/i);
  assert.doesNotMatch(workflow, /\bscp\b/i);
  assert.doesNotMatch(workflow, /\brsync\b/i);
  assert.doesNotMatch(workflow, /argus\.enarah/i);
  assert.doesNotMatch(workflow, /\$\{\{\s*secrets\./);
  assert.doesNotMatch(workflow, /actions\/runs\/\$ARTIFACT_RUN_ID\/artifacts/);
  assert.doesNotMatch(workflow, /artifact\.archive_download_url/);
});

test("AlmaLinux compatibility workflow validates manual inputs before shell use", () => {
  const workflow = compatibilityWorkflow();

  assert.match(workflow, /ARTIFACT_RUN_ID_INPUT:\s*\$\{\{\s*inputs\.artifact_run_id\s*\}\}/);
  assert.match(workflow, /ARTIFACT_NAME_INPUT:\s*\$\{\{\s*inputs\.artifact_name\s*\}\}/);
  assert.match(workflow, /EXPECTED_SOURCE_SHA_INPUT:\s*\$\{\{\s*inputs\.expected_source_sha\s*\}\}/);
  assert.match(workflow, /EXPECTED_ARCHIVE_SHA256_INPUT:\s*\$\{\{\s*inputs\.expected_archive_sha256\s*\}\}/);
  assert.match(workflow, /\^\[0-9\]\+\$/);
  assert.match(workflow, /\^ropes-\[0-9a-f\]\{12\}-linux-x64\$/);
  assert.match(workflow, /\^\[0-9a-fA-F\]\{40\}\$/);
  assert.match(workflow, /\^\[0-9a-fA-F\]\{64\}\$/);

  for (const block of runBlocks(workflow)) {
    for (const inputName of [
      "artifact_run_id",
      "artifact_name",
      "expected_source_sha",
      "expected_archive_sha256",
    ]) {
      assert.equal(
        block.includes(`\${{ inputs.${inputName} }}`),
        false,
        `manual ${inputName} input must be passed through env before shell use`,
      );
    }
  }
});

test("AlmaLinux compatibility workflow verifies the existing archive identity", () => {
  const workflow = compatibilityWorkflow();

  assert.match(workflow, /uses:\s*actions\/download-artifact@v4/);
  assert.match(workflow, /path:\s*\$\{\{\s*runner\.temp\s*\}\}\/ropes-almalinux-artifact/);
  assert.match(workflow, /sha256sum "\$archive_path"/);
  assert.match(workflow, /recorded_archive_sha/);
  assert.match(workflow, /EXPECTED_ARCHIVE_SHA256/);
  assert.match(workflow, /\["repository", "enarah\/ropes"\]/);
  assert.match(workflow, /gitCommitSha/);
  assert.match(workflow, /buildWorkflowPath/);
  assert.match(workflow, /\.github\/workflows\/release-artifact\.yml/);
  assert.match(workflow, /artifactFileName/);
  assert.match(workflow, /artifactSha256/);
  assert.match(workflow, /expectedShortSha/);
  assert.match(workflow, /expectedArtifactName/);
  assert.match(workflow, /deploymentAuthorized !== false/);
  assert.match(workflow, /prisma\/seed\.ts/);
});

test("AlmaLinux compatibility workflow inspects tarball before extraction", () => {
  const workflow = compatibilityWorkflow();

  const tarInspectIndex = workflow.indexOf("Inspect release tarball before extraction");
  const extractIndex = workflow.indexOf("Extract release archive");

  assert.notEqual(tarInspectIndex, -1);
  assert.notEqual(extractIndex, -1);
  assert.ok(
    tarInspectIndex < extractIndex,
    "tarball path/link safety inspection must run before extraction",
  );

  const tarInspectStep = workflow.slice(tarInspectIndex, extractIndex);
  assert.match(workflow, /\bpython3\b/);
  assert.match(tarInspectStep, /python3 <<'PY'/);
  assert.match(tarInspectStep, /tarfile\.open\(archive_path, "r:gz"\)/);
  assert.match(tarInspectStep, /archive\.getmembers\(\)/);
  assert.match(tarInspectStep, /name\.startswith\("\/"\)/);
  assert.match(tarInspectStep, /any\(part == "\.\." for part in name\.split\("\/"\)\)/);
  assert.match(tarInspectStep, /not name\.startswith\(root\)/);
  assert.match(tarInspectStep, /member\.issym\(\) or member\.islnk\(\)/);
  assert.match(tarInspectStep, /member\.linkname/);
  assert.match(tarInspectStep, /target\.startswith\("\/"\)/);
  assert.match(tarInspectStep, /posixpath\.normpath/);
  assert.match(tarInspectStep, /release archive link target escapes release root/);
  assert.doesNotMatch(tarInspectStep, /tar -tvzf "\$archive_path"/);
  assert.doesNotMatch(tarInspectStep, /ropes-almalinux-tar-verbose/);
  assert.match(workflow, /rm -rf "\$extract_dir"/);
});

test("AlmaLinux compatibility workflow verifies extracted ROPES release manifest", () => {
  const workflow = compatibilityWorkflow();

  assert.match(workflow, /Verify extracted release manifest/);
  assert.match(workflow, /ROPES-RELEASE\.json/);
  assert.match(workflow, /\["repository", "enarah\/ropes"\]/);
  assert.match(workflow, /\["gitCommitSha", process\.env\.EXPECTED_SOURCE_SHA\]/);
  assert.match(workflow, /\["shortSha", expectedShortSha\]/);
  assert.match(workflow, /\["buildWorkflowPath", "\.github\/workflows\/release-artifact\.yml"\]/);
  assert.match(workflow, /release\.deploymentAuthorized !== false/);
  assert.match(workflow, /applicationPackageVersion/);
  assert.match(workflow, /nextVersion/);
  assert.match(workflow, /prismaVersion/);
  assert.match(workflow, /lockfileSha256/);
  assert.match(workflow, /migrationSetSha256/);
});

test("AlmaLinux compatibility workflow conditionally loads packaged sharp", () => {
  const workflow = compatibilityWorkflow();

  assert.match(workflow, /fs\.existsSync\("\.\/node_modules\/sharp"\)/);
  assert.match(workflow, /require\("\.\/node_modules\/sharp"\)/);
  assert.match(workflow, /sharp failed to load from packaged artifact/);
  assert.match(workflow, /packaged sharp module is not present; skipping optional sharp load check/);
});

test("AlmaLinux compatibility workflow proves as-shipped liveness before Prisma mutation", () => {
  const workflow = compatibilityWorkflow();

  const asShippedIndex = workflow.indexOf("Prove as-shipped liveness before Prisma generation");
  const prismaIndex = workflow.indexOf("Prove Prisma tooling and migrations");
  const provisioningIndex = workflow.indexOf("Prove provisioning tooling");

  assert.notEqual(asShippedIndex, -1);
  assert.notEqual(prismaIndex, -1);
  assert.notEqual(provisioningIndex, -1);
  assert.ok(
    asShippedIndex < prismaIndex,
    "as-shipped liveness must run before Prisma generation/validation/deploy",
  );
  assert.ok(
    asShippedIndex < provisioningIndex,
    "as-shipped liveness must run before provisioning tooling",
  );

  const asShippedStep = workflow.slice(asShippedIndex, prismaIndex);
  assert.match(asShippedStep, /\/api\/health/);
  assert.doesNotMatch(asShippedStep, /\/api\/ready/);
  assert.doesNotMatch(asShippedStep, /DATABASE_URL/);
  assert.doesNotMatch(asShippedStep, /GOOGLE_CLIENT_/);
  assert.doesNotMatch(asShippedStep, /NEXTAUTH_SECRET/);
  assert.doesNotMatch(asShippedStep, /npm run db:generate/);
  assert.doesNotMatch(asShippedStep, /npx prisma validate/);
  assert.doesNotMatch(asShippedStep, /npm run db:deploy/);
  assert.doesNotMatch(asShippedStep, /npm run provision:user/);
});
