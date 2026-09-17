import "dotenv/config";
import process from "node:process";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { MembershipStatus, OrganisationType } from "@prisma/client";
import type { OrganisationCapabilityKey } from "../lib/capability-registry";
import {
  applyProvisioningPlan,
  buildProvisioningPlan,
  normaliseProvisionUserInput,
  ProvisioningInputError,
  readProvisioningState,
  type ProvisionUserInput,
} from "../lib/provisioning";

type CliOptions = ProvisionUserInput & {
  help: boolean;
};

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  const connectionString = process.env["DATABASE_URL"];

  if (!connectionString) {
    throw new ProvisioningInputError(
      "DATABASE_URL is required for provisioning dry-run or apply inspection.",
    );
  }

  normaliseProvisionUserInput(options);

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    if (options.apply) {
      const plan = await applyProvisioningPlan(prisma, options);
      printPlan(plan, "apply");
      console.log("PASS provisioning apply completed safely");
      return;
    }

    const state = await readProvisioningState(prisma, options);
    const plan = buildProvisioningPlan(options, state);
    printPlan(plan, "dry-run");

    if (!plan.canApply) {
      process.exitCode = 1;
      return;
    }

    console.log("PASS dry-run completed without conflicts");
  } finally {
    await prisma.$disconnect();
  }
}

function parseArgs(args: string[]): CliOptions {
  const capabilities: OrganisationCapabilityKey[] = [];
  const options: Partial<CliOptions> = {
    apply: false,
    bootstrapOrganisation: false,
    capabilities,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--apply") {
      options.apply = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.apply = false;
      continue;
    }

    if (arg === "--bootstrap-organisation") {
      options.bootstrapOrganisation = true;
      continue;
    }

    if (arg.startsWith("--capability=")) {
      addCapabilities(capabilities, arg.slice("--capability=".length));
      continue;
    }

    if (arg === "--capability") {
      addCapabilities(capabilities, requiredArg(args, index, arg));
      index += 1;
      continue;
    }

    if (arg.startsWith("--")) {
      const [key, valueFromEquals] = arg.split("=", 2);
      const value =
        valueFromEquals ?? requiredArg(args, index, key);

      if (!valueFromEquals) {
        index += 1;
      }

      switch (key) {
        case "--email":
          options.email = value;
          break;
        case "--name":
          options.displayName = value;
          break;
        case "--organisation":
          options.organisationSlug = value;
          break;
        case "--organisation-name":
          options.organisationName = value;
          break;
        case "--organisation-type":
          options.organisationType = value as OrganisationType;
          break;
        case "--role":
          options.roleName = value;
          break;
        case "--status":
          options.membershipStatus = value as MembershipStatus;
          break;
        default:
          throw new ProvisioningInputError(`Unknown option: ${key}`);
      }
      continue;
    }

    throw new ProvisioningInputError(`Unexpected argument: ${arg}`);
  }

  if (options.help) {
    return options as CliOptions;
  }

  assertRequired(options.email, "--email is required.");
  assertRequired(options.displayName, "--name is required.");
  assertRequired(options.organisationSlug, "--organisation is required.");
  assertRequired(options.roleName, "--role is required.");
  assertRequired(options.membershipStatus, "--status is required.");

  return options as CliOptions;
}

function requiredArg(args: string[], index: number, option: string) {
  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new ProvisioningInputError(`${option} requires a value.`);
  }

  return value;
}

function assertRequired(
  value: string | undefined,
  message: string,
): asserts value is string {
  if (!value) {
    throw new ProvisioningInputError(message);
  }
}

function addCapabilities(
  capabilities: OrganisationCapabilityKey[],
  value: string,
) {
  for (const capability of value.split(",")) {
    const trimmedCapability = capability.trim();

    if (trimmedCapability) {
      capabilities.push(trimmedCapability as OrganisationCapabilityKey);
    }
  }
}

function printPlan(
  plan: ReturnType<typeof buildProvisioningPlan>,
  mode: "apply" | "dry-run",
) {
  console.log(`ROPES user provisioning ${mode}`);
  console.log(`Email: ${plan.input.email}`);
  console.log(`Display name: ${plan.input.displayName}`);
  console.log(`Organisation: ${plan.input.organisationSlug}`);
  console.log(`Role: ${plan.input.roleName}`);
  console.log(`Membership status: ${plan.input.membershipStatus}`);
  console.log(`Apply requested: ${mode === "apply" ? "yes" : "no"}`);
  console.log("Planned state:");

  for (const action of plan.actions) {
    console.log(
      `- ${action.entity} ${action.identifier}: ${action.status} - ${action.detail}`,
    );
  }

  if (plan.conflicts.length > 0) {
    console.error("Conflicts:");

    for (const conflict of plan.conflicts) {
      console.error(`- ${conflict}`);
    }
  }
}

function printUsage() {
  console.log(`Usage:
  npm run provision:user -- --email <email> --name <display name> --organisation <slug> --role <role> --status ACTIVE [options]

Required:
  --email <email>              OAuth email that must match the ROPES User
  --name <display name>        Explicit display name for a newly-created User
  --organisation <slug>        Target organisation slug
  --role <canonical role>      Existing canonical ROPES role name
  --status <status>            Membership status, usually ACTIVE

Safe defaults:
  --dry-run                    Default; inspect and print the plan only
  --apply                      Explicitly apply a conflict-free plan

Optional bootstrap:
  --bootstrap-organisation     Allow creation of the missing ENARAH organisation
  --organisation-name <name>   Required when bootstrapping an organisation
  --organisation-type ENARAH   Optional; ENARAH is the only supported type here
  --capability <key>           Explicit capability to enable; repeat or comma-separate

This command never provisions on app startup, OAuth sign-in, install, build or migration.
Do not run it against Argus or controlled/live data until the deployment/provisioning run is separately authorised.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ERROR ${message}`);
  process.exitCode = 1;
});
