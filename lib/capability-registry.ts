import type { ModuleSlug } from "@/lib/dashboard-data";

export type OrganisationCapabilityKey =
  | "trips"
  | "trips.approvals"
  | "trips.riskAssessment"
  | "trips.journeyManagement"
  | "trips.tripReports"
  | "trips.pdfExport"
  | "vehicles"
  | "vehicles.bookings"
  | "vehicles.preStarts"
  | "vehicles.defects"
  | "vehicles.maintenance"
  | "fulcrum"
  | "fulcrum.import"
  | "fulcrum.maps"
  | "grants"
  | "grants.management"
  | "grants.appb"
  | "grants.acquittals"
  | "grants.progressReporting"
  | "reporting"
  | "reporting.appb"
  | "reporting.funderTemplates"
  | "safety"
  | "integrations"
  | "integrations.googleCalendar"
  | "integrations.spotTracker"
  | "integrations.teams"
  | "ai"
  | "ai.assistant"
  | "ai.localProvider"
  | "ai.frontierProvider"
  | "branding"
  | "branding.customTheme";

export type OrganisationModuleKey =
  | "trips"
  | "vehicles"
  | "fulcrum"
  | "grants"
  | "reporting"
  | "safety"
  | "integrations"
  | "ai"
  | "branding";

export type CapabilityDefinition = {
  description: string;
  key: OrganisationCapabilityKey;
  moduleKey: OrganisationModuleKey;
  label: string;
};

export const capabilityDefinitions = [
  {
    description: "Trips module shell and trip record access.",
    key: "trips",
    label: "Trips",
    moduleKey: "trips",
  },
  {
    description: "Trip approval workflow and approval notes.",
    key: "trips.approvals",
    label: "Trip approvals",
    moduleKey: "trips",
  },
  {
    description: "Trip risk assessment classification and controls.",
    key: "trips.riskAssessment",
    label: "Trip risk assessment",
    moduleKey: "trips",
  },
  {
    description: "Journey management plan fields and check-in planning.",
    key: "trips.journeyManagement",
    label: "Journey management",
    moduleKey: "trips",
  },
  {
    description: "Live trip notes and trip report drafting.",
    key: "trips.tripReports",
    label: "Trip reports",
    moduleKey: "trips",
  },
  {
    description: "Trip PDF/document export surfaces.",
    key: "trips.pdfExport",
    label: "Trip PDF export",
    moduleKey: "trips",
  },
  {
    description: "Vehicles module shell and fleet register access.",
    key: "vehicles",
    label: "Vehicles",
    moduleKey: "vehicles",
  },
  {
    description: "Vehicle bookings within one owning organisation.",
    key: "vehicles.bookings",
    label: "Vehicle bookings",
    moduleKey: "vehicles",
  },
  {
    description: "Vehicle pre-start checklist submissions.",
    key: "vehicles.preStarts",
    label: "Vehicle pre-starts",
    moduleKey: "vehicles",
  },
  {
    description: "Vehicle defect reporting and status updates.",
    key: "vehicles.defects",
    label: "Vehicle defects",
    moduleKey: "vehicles",
  },
  {
    description: "Vehicle maintenance record capture.",
    key: "vehicles.maintenance",
    label: "Vehicle maintenance",
    moduleKey: "vehicles",
  },
  {
    description: "Fulcrum companion module shell.",
    key: "fulcrum",
    label: "Fulcrum",
    moduleKey: "fulcrum",
  },
  {
    description: "Manual Fulcrum metadata and record imports.",
    key: "fulcrum.import",
    label: "Fulcrum import",
    moduleKey: "fulcrum",
  },
  {
    description: "Fulcrum map and location surfaces.",
    key: "fulcrum.maps",
    label: "Fulcrum maps",
    moduleKey: "fulcrum",
  },
  {
    description: "Future Grants module shell.",
    key: "grants",
    label: "Grants",
    moduleKey: "grants",
  },
  {
    description: "Future grant management workflows.",
    key: "grants.management",
    label: "Grant management",
    moduleKey: "grants",
  },
  {
    description: "Future grant-scoped APP&B reporting workflows.",
    key: "grants.appb",
    label: "Grant APP&B reporting",
    moduleKey: "grants",
  },
  {
    description: "Future grant acquittal workflows.",
    key: "grants.acquittals",
    label: "Grant acquittals",
    moduleKey: "grants",
  },
  {
    description: "Future grant progress and milestone reporting workflows.",
    key: "grants.progressReporting",
    label: "Grant progress reporting",
    moduleKey: "grants",
  },
  {
    description: "Reporting module and shared report surfaces.",
    key: "reporting",
    label: "Reporting",
    moduleKey: "reporting",
  },
  {
    description: "Future APP&B reporting template mapping and workbook generation.",
    key: "reporting.appb",
    label: "APP&B reporting",
    moduleKey: "reporting",
  },
  {
    description: "Future funder template profile and version management.",
    key: "reporting.funderTemplates",
    label: "Funder templates",
    moduleKey: "reporting",
  },
  {
    description: "Safety, contacts, devices and emergency planning surfaces.",
    key: "safety",
    label: "Safety",
    moduleKey: "safety",
  },
  {
    description: "Optional external integration framework.",
    key: "integrations",
    label: "Integrations",
    moduleKey: "integrations",
  },
  {
    description: "Future Google Calendar integration.",
    key: "integrations.googleCalendar",
    label: "Google Calendar",
    moduleKey: "integrations",
  },
  {
    description: "Future SPOT/finder tracker integration.",
    key: "integrations.spotTracker",
    label: "SPOT tracker",
    moduleKey: "integrations",
  },
  {
    description: "Future Teams integration.",
    key: "integrations.teams",
    label: "Teams",
    moduleKey: "integrations",
  },
  {
    description: "Optional AI module foundation.",
    key: "ai",
    label: "AI",
    moduleKey: "ai",
  },
  {
    description: "Future AI assistant surfaces.",
    key: "ai.assistant",
    label: "AI assistant",
    moduleKey: "ai",
  },
  {
    description: "Future local LLM provider option.",
    key: "ai.localProvider",
    label: "Local AI provider",
    moduleKey: "ai",
  },
  {
    description: "Future frontier/cloud provider option.",
    key: "ai.frontierProvider",
    label: "Frontier AI provider",
    moduleKey: "ai",
  },
  {
    description: "Branding module and theme controls.",
    key: "branding",
    label: "Branding",
    moduleKey: "branding",
  },
  {
    description: "Future organisation-specific theme controls.",
    key: "branding.customTheme",
    label: "Custom theme",
    moduleKey: "branding",
  },
] as const satisfies readonly CapabilityDefinition[];

export const organisationCapabilityKeys = capabilityDefinitions.map(
  (capability) => capability.key,
);

export const defaultDemoCapabilityKeys = [
  "trips",
  "trips.approvals",
  "trips.riskAssessment",
  "trips.journeyManagement",
  "vehicles",
  "vehicles.bookings",
  "vehicles.preStarts",
  "vehicles.defects",
  "vehicles.maintenance",
  "fulcrum",
  "fulcrum.import",
  "fulcrum.maps",
  "reporting",
  "safety",
  "integrations",
  "branding",
] as const satisfies readonly OrganisationCapabilityKey[];

const moduleNavigationCapabilityMap = {
  compliance: "safety",
  fulcrum: "fulcrum",
  reports: "reporting",
  trips: "trips",
  vehicles: "vehicles",
} as const satisfies Partial<Record<ModuleSlug, OrganisationCapabilityKey>>;

export function isOrganisationCapabilityKey(
  value: string,
): value is OrganisationCapabilityKey {
  return organisationCapabilityKeys.some((key) => key === value);
}

export function getCapabilityDefinition(key: OrganisationCapabilityKey) {
  return capabilityDefinitions.find((capability) => capability.key === key);
}

export function getModuleKeyForCapability(key: OrganisationCapabilityKey) {
  return getCapabilityDefinition(key)?.moduleKey ?? key.split(".")[0];
}

export function organisationHasCapability(
  capabilityKeys: readonly OrganisationCapabilityKey[] | undefined,
  key: OrganisationCapabilityKey,
) {
  return Boolean(capabilityKeys?.includes(key));
}

export function moduleRequiresCapability(moduleSlug: ModuleSlug) {
  if (moduleSlug in moduleNavigationCapabilityMap) {
    return moduleNavigationCapabilityMap[
      moduleSlug as keyof typeof moduleNavigationCapabilityMap
    ];
  }

  return undefined;
}

export function isModuleEnabledForCapabilities(
  moduleSlug: ModuleSlug,
  capabilityKeys: readonly OrganisationCapabilityKey[] | undefined,
) {
  const requiredCapability = moduleRequiresCapability(moduleSlug);

  return requiredCapability
    ? organisationHasCapability(capabilityKeys, requiredCapability)
    : true;
}
