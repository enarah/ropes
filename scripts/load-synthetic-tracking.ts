import "dotenv/config";
import { getPrismaClient } from "../lib/db";
import { assertSyntheticTrackingEnvironment, loadSyntheticTrackingData, SyntheticTrackingGuardError } from "../lib/tracking/demo-loader";

async function main() {
  // Check every guard before constructing a client or attempting a connection.
  assertSyntheticTrackingEnvironment(process.env);
  const prisma = getPrismaClient();
  try {
    const result = await loadSyntheticTrackingData(prisma, process.env);
    console.log(`Loaded synthetic tracking only: ${result.assets} assets across ${result.organisations} existing demo organisations; ${result.tripLinked} trip-linked. Integrations remain disabled.`);
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof SyntheticTrackingGuardError ? error.message : "Synthetic tracking load failed. Review the database connection and fixture ownership.");
  process.exitCode = 1;
});
