import "dotenv/config";
import { getPrismaClient } from "../lib/db";
import { runSpotOneShotCommand } from "../lib/tracking/one-shot-command";

runSpotOneShotCommand(process.argv.slice(2), process.env, {
  createPrisma: getPrismaClient,
  write: (summary) => console.log(summary),
}).then((exitCode) => { process.exitCode = exitCode; }).catch(() => {
  console.error('{"result":"FAILED","code":"PERSISTENCE_FAILED"}');
  process.exitCode = 1;
});
