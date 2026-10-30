import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("demo container keeps startup and destructive database operations separate", () => {
  const dockerfile = readFileSync("Dockerfile", "utf8");
  const compose = readFileSync("docker-compose.demo.yml", "utf8");
  const appSection = compose.split("  ropes: &demo-app")[1]?.split("  migrate:")[0];
  assert.ok(appSection);
  assert.match(dockerfile, /FROM node:26[^\s]* AS demo/);
  assert.match(dockerfile, /ROPES_DEMO_MODE=true/);
  assert.match(dockerfile, /CMD \["npm", "run", "dev"/);
  assert.doesNotMatch(dockerfile, /db:(?:seed|deploy)/);
  assert.match(compose, /image: postgres:16\b/);
  assert.match(appSection, /NODE_ENV: development/);
  assert.match(appSection, /ROPES_DEMO_MODE: "true"/);
  assert.doesNotMatch(appSection, /NODE_ENV: production|db:(?:seed|deploy)/);
  assert.match(compose, /profiles: \["tools"\]/);
  assert.match(compose, /command: \["npm", "run", "db:deploy"\]/);
  assert.match(compose, /command: \["npm", "run", "db:seed"\]/);
  assert.match(compose, /ALLOW_DESTRUCTIVE_DEMO_SEED: "true"/);
  assert.match(compose, /DESTRUCTIVE — DISPOSABLE DEMO DATABASE ONLY/);
  const seedSource = readFileSync("prisma/seed.ts", "utf8");
  assert.match(seedSource, /ALLOW_DESTRUCTIVE_DEMO_SEED/);
  assert.match(seedSource, /databaseName !== "ropes_demo"/);
  assert.match(seedSource, /NODE_ENV"\] === "production"/);
  assert.doesNotMatch(compose + dockerfile, /argus\.enarah|GOOGLE_CLIENT_SECRET|NEXTAUTH_SECRET/i);
});
