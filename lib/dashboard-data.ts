export const navigationItems = [
  {
    label: "Overview",
    slug: "overview",
    href: "/",
    description:
      "Current trips, fleet signals, approvals, risks and reporting deadlines.",
  },
  {
    label: "Organisations",
    slug: "organisations",
    href: "/organisations",
    description:
      "Tenant management placeholder for Enarah and partner organisations.",
  },
  {
    label: "Ranger Operations",
    slug: "ranger-operations",
    href: "/ranger-operations",
    description:
      "Program profiles, teams, workplans, activities and evidence summaries.",
  },
  {
    label: "Trips",
    slug: "trips",
    href: "/trips",
    description:
      "Journey planning, approvals, itineraries, checklists and trip reporting.",
  },
  {
    label: "Vehicles",
    slug: "vehicles",
    href: "/vehicles",
    description:
      "Fleet register, bookings, pre-start checks, defects and service signals.",
  },
  {
    label: "Projects",
    slug: "projects",
    href: "/projects",
    description:
      "Funding streams, milestones, workplans, deliverables and evidence.",
  },
  {
    label: "People",
    slug: "people",
    href: "/people",
    description:
      "Staff profiles, memberships, training records and role placeholders.",
  },
  {
    label: "Fulcrum",
    slug: "fulcrum",
    href: "/fulcrum",
    description:
      "Future Fulcrum companion area for app catalogues and field data health.",
  },
  {
    label: "Reports",
    slug: "reports",
    href: "/reports",
    description:
      "Trip, ranger activity, funding, board and data quality report surfaces.",
  },
  {
    label: "Compliance",
    slug: "compliance",
    href: "/compliance",
    description:
      "WHS, incidents, policy, risk, training and audit-log placeholders.",
  },
  {
    label: "Settings",
    slug: "settings",
    href: "/settings",
    description:
      "Platform configuration placeholder without credentials or auth controls.",
  },
] as const;

export type ModuleSlug = (typeof navigationItems)[number]["slug"];
type NavigationItem = (typeof navigationItems)[number];
type DashboardMetric = {
  label: string;
  value: string;
  caption: string;
};
type ScopedRecord = {
  moduleSlug: ModuleSlug;
  organisationSlug: OrganisationSlug;
  title: string;
  status: string;
  detail: string;
  meta: string;
};

export const demoOrganisations = [
  {
    name: "ROPES Demo Aboriginal Corporation",
    slug: "ropes-demo-aboriginal-corporation",
    type: "Demo partner",
    region: "Demo North Region",
  },
  {
    name: "Demo Enarah Services",
    slug: "demo-enarah-services",
    type: "Enarah internal",
    region: "Enarah operations",
  },
] as const;

export type OrganisationSlug = (typeof demoOrganisations)[number]["slug"];

export const fakeCurrentSession = {
  user: {
    name: "Demo Operations Manager",
    email: "operations.manager@example.test",
  },
  memberships: demoOrganisations.map((organisation) => ({
    organisationSlug: organisation.slug,
    role:
      organisation.slug === "demo-enarah-services"
        ? "Enarah Admin"
        : "Operations Manager",
  })),
} as const;

export const moduleSlugs = navigationItems.map((item) => item.slug);

export function isModuleSlug(slug: string): slug is ModuleSlug {
  return moduleSlugs.some((moduleSlug) => moduleSlug === slug);
}

export function getSelectedOrganisation(
  organisationSlug?: string | null,
): (typeof demoOrganisations)[number] {
  return (
    demoOrganisations.find(
      (organisation) => organisation.slug === organisationSlug,
    ) ?? demoOrganisations[0]
  );
}

export const modulePanels = [
  {
    slug: "organisations",
    title: "Organisation management",
    status: "Shell",
    summary:
      "Shows where Enarah and partner tenants will be separated when auth and permissions are added.",
  },
  {
    slug: "ranger-operations",
    title: "Ranger operations",
    status: "Demo",
    summary:
      "Placeholder area for program workplans, activities, field evidence and report-ready summaries.",
  },
  {
    slug: "trips",
    title: "Trip planning",
    status: "Demo",
    summary:
      "Future journey-management module for approvals, participants, checklists and trip reports.",
  },
  {
    slug: "vehicles",
    title: "Vehicle register",
    status: "Demo",
    summary:
      "Fleet placeholder for bookings, drivers, pre-starts, defects and service schedules.",
  },
  {
    slug: "fulcrum",
    title: "Fulcrum companion",
    status: "Offline",
    summary:
      "Module shell only. No Fulcrum API credentials, records or sync actions are connected.",
  },
  {
    slug: "reports",
    title: "Reporting pack",
    status: "Shell",
    summary:
      "Future surfaces for funding, board, activity, trip and data quality reports.",
  },
] as const;

export function getDashboardStats(organisationSlug: OrganisationSlug) {
  const records = getOrganisationRecords(organisationSlug);

  return [
    {
      label: "Upcoming trips",
      value: String(countRecords(records, "trips")),
      caption: "Demo journeys scoped to the selected organisation.",
    },
    {
      label: "Vehicles tracked",
      value: String(countRecords(records, "vehicles")),
      caption: "Placeholder fleet records for this organisation only.",
    },
    {
      label: "Open reports",
      value: String(countRecords(records, "reports")),
      caption: "Draft reporting surfaces in the active tenant context.",
    },
    {
      label: "Risks flagged",
      value: String(countRecords(records, "compliance")),
      caption: "Mock WHS and operational risks for this organisation.",
    },
  ];
}

export function getOverviewActivity(organisationSlug: OrganisationSlug) {
  const records = getOrganisationRecords(organisationSlug).slice(0, 3);

  return records.map((record) => ({
    title: record.title,
    description: `${record.detail} ${record.meta}.`,
  }));
}

export function getModuleBySlug(
  slug: ModuleSlug,
  organisationSlug: OrganisationSlug,
): NavigationItem & { metrics: DashboardMetric[] } {
  const navigationItem = navigationItems.find((item) => item.slug === slug);

  return {
    ...(navigationItem ?? navigationItems[0]),
    metrics: getMetricsForModule(slug, organisationSlug),
  };
}

export function getModuleRecords(
  moduleSlug: ModuleSlug,
  organisationSlug: OrganisationSlug,
) {
  if (moduleSlug === "overview") {
    return getOrganisationRecords(organisationSlug).slice(0, 6);
  }

  if (moduleSlug === "settings") {
    const organisation = getSelectedOrganisation(organisationSlug);

    return [
      {
        moduleSlug,
        organisationSlug,
        title: "Demo tenant settings",
        status: "Placeholder",
        detail: "Settings are scoped to the selected organisation context.",
        meta: `${organisation.type} / no authentication settings yet`,
      },
    ];
  }

  return scopedRecords.filter(
    (record) =>
      record.organisationSlug === organisationSlug &&
      record.moduleSlug === moduleSlug,
  );
}

export function isOperationalModule(moduleSlug: ModuleSlug) {
  return moduleSlug !== "overview" && moduleSlug !== "settings";
}

function getOrganisationRecords(organisationSlug: OrganisationSlug) {
  return scopedRecords.filter(
    (record) => record.organisationSlug === organisationSlug,
  );
}

function countRecords(records: ScopedRecord[], moduleSlug: ModuleSlug) {
  return records.filter((record) => record.moduleSlug === moduleSlug).length;
}

function getMetricsForModule(
  slug: ModuleSlug,
  organisationSlug: OrganisationSlug,
) {
  const organisation = getSelectedOrganisation(organisationSlug);
  const records = getModuleRecords(slug, organisationSlug);
  const metricMap: Record<ModuleSlug, DashboardMetric[]> = {
    overview: [
      {
        label: "Demo modules",
        value: "11",
        caption: "Core ROPES navigation areas are represented.",
      },
      {
        label: "Active organisation",
        value: organisation.type,
        caption: "All mock data below is filtered to this context.",
      },
      {
        label: "Secrets",
        value: "0",
        caption: "No API keys, tokens or credentials are included.",
      },
    ],
    organisations: [
      {
        label: "Visible tenants",
        value: String(demoOrganisations.length),
        caption: "Fake current user can switch between demo memberships.",
      },
      {
        label: "Org switcher",
        value: "Demo",
        caption: "Uses query-string state, not authentication.",
      },
      {
        label: "Data scope",
        value: organisation.name,
        caption: "Operational lists use the selected organisation context.",
      },
    ],
    "ranger-operations": [
      {
        label: "Programs",
        value: String(records.length),
        caption: `Fake ranger programs for ${organisation.name}.`,
      },
      {
        label: "Data scope",
        value: "Org",
        caption: "No cross-organisation records are shown.",
      },
      {
        label: "Evidence",
        value: "Shell",
        caption: "Evidence cards will connect to future module data.",
      },
    ],
    trips: [
      {
        label: "Upcoming",
        value: String(records.length),
        caption: `Demo trip summaries for ${organisation.name}.`,
      },
      {
        label: "Approvals",
        value: "Mock",
        caption: "Approval flows are not implemented in this milestone.",
      },
      {
        label: "Check-ins",
        value: "Later",
        caption: "Field check-ins will arrive after the Trips MVP.",
      },
    ],
    vehicles: [
      {
        label: "Fleet",
        value: String(records.length),
        caption: `Fake vehicles assigned to ${organisation.name}.`,
      },
      {
        label: "Defects",
        value: String(records.filter((record) => record.status === "Maintenance").length),
        caption: "Placeholder signal only, not a stored vehicle defect.",
      },
      {
        label: "Bookings",
        value: "Demo",
        caption: "Booking workflows will be added in a later module.",
      },
    ],
    projects: [
      {
        label: "Projects",
        value: String(records.length),
        caption: `Fake funded projects for ${organisation.name}.`,
      },
      {
        label: "Milestones",
        value: "4",
        caption: "Placeholder milestone count for future project tracking.",
      },
      {
        label: "Evidence",
        value: "Later",
        caption: "Evidence links will be attached after data models exist.",
      },
    ],
    people: [
      {
        label: "People",
        value: String(records.length),
        caption: `Fake people records visible to ${organisation.name}.`,
      },
      {
        label: "Training",
        value: "3",
        caption: "Placeholder training records only.",
      },
      {
        label: "Roles",
        value: "Docs",
        caption: "Role definitions live in the permissions documentation.",
      },
    ],
    fulcrum: [
      {
        label: "Connections",
        value: String(records.length),
        caption: "No Fulcrum credentials or API calls are included.",
      },
      {
        label: "Apps",
        value: "3",
        caption: "Mock app count only for future module planning.",
      },
      {
        label: "Sync status",
        value: "Offline",
        caption: "Manual and scheduled syncs are future work.",
      },
    ],
    reports: [
      {
        label: "Drafts",
        value: String(records.length),
        caption: `Demo report surfaces for ${organisation.name}.`,
      },
      {
        label: "Exports",
        value: "Later",
        caption: "Export actions will need audit logging later.",
      },
      {
        label: "Templates",
        value: "Shell",
        caption: "Report templates are only represented visually.",
      },
    ],
    compliance: [
      {
        label: "Risks",
        value: String(records.length),
        caption: `Fake WHS and operational risk signals for ${organisation.name}.`,
      },
      {
        label: "Incidents",
        value: "1",
        caption: "Placeholder incident count for the compliance shell.",
      },
      {
        label: "Audit logs",
        value: "Later",
        caption: "Audit logging comes with real actions and permissions.",
      },
    ],
    settings: [
      {
        label: "Auth",
        value: "Later",
        caption: "Authentication and user settings are intentionally absent.",
      },
      {
        label: "Secrets",
        value: "None",
        caption: "No API keys or credential fields exist in the shell.",
      },
      {
        label: "Tenancy",
        value: "Planned",
        caption: "Settings will become organisation-aware after auth.",
      },
    ],
  };

  return metricMap[slug];
}

const scopedRecords: ScopedRecord[] = [
  {
    moduleSlug: "organisations",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    title: "ROPES Demo Aboriginal Corporation",
    status: "Selected tenant",
    detail: "Fake partner organisation available to the demo user.",
    meta: "Demo North Region",
  },
  {
    moduleSlug: "ranger-operations",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    title: "Demo North Country Rangers",
    status: "Active",
    detail: "Mock ranger program for water point and track inspection work.",
    meta: "Project DEMO-CW-001",
  },
  {
    moduleSlug: "trips",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    title: "Demo Water Point Inspection Trip",
    status: "Planned",
    detail: "Fake journey management record with a lead ranger and vehicle booking.",
    meta: "10-12 Aug 2026",
  },
  {
    moduleSlug: "vehicles",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    title: "Demo LandCruiser 1",
    status: "Booked",
    detail: "Mock fleet record allocated to the water point inspection trip.",
    meta: "DEMO-001",
  },
  {
    moduleSlug: "vehicles",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    title: "Demo Troopy",
    status: "Maintenance",
    detail: "Mock fleet record showing an organisation-scoped service signal.",
    meta: "DEMO-003",
  },
  {
    moduleSlug: "projects",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    title: "Demo Country and Waterways Project",
    status: "Funded",
    detail: "Fake project linking ranger work, trips and Fulcrum records.",
    meta: "DEMO-CW-001",
  },
  {
    moduleSlug: "people",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    title: "Demo Head Ranger",
    status: "Active",
    detail: "Fake staff profile for the selected partner organisation.",
    meta: "Ranger Coordinator / Head Ranger",
  },
  {
    moduleSlug: "fulcrum",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    title: "Demo Water Point Inspection Form",
    status: "Offline",
    detail: "Fake Fulcrum app metadata with no API connection or token.",
    meta: "2 mock records",
  },
  {
    moduleSlug: "reports",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    title: "Demo Quarterly Ranger Activity Report",
    status: "Draft",
    detail: "Mock report surface filtered to the selected organisation.",
    meta: "Q1 demo period",
  },
  {
    moduleSlug: "compliance",
    organisationSlug: "ropes-demo-aboriginal-corporation",
    title: "Demo Remote Travel Risk",
    status: "Open",
    detail: "Fake WHS risk visible only in this organisation context.",
    meta: "Review before trip",
  },
  {
    moduleSlug: "organisations",
    organisationSlug: "demo-enarah-services",
    title: "Demo Enarah Services",
    status: "Selected tenant",
    detail: "Fake internal organisation available to the demo user.",
    meta: "Enarah operations",
  },
  {
    moduleSlug: "ranger-operations",
    organisationSlug: "demo-enarah-services",
    title: "Demo Partner Support Workplan",
    status: "Active",
    detail: "Mock internal operations program for partner support.",
    meta: "Internal support",
  },
  {
    moduleSlug: "trips",
    organisationSlug: "demo-enarah-services",
    title: "Demo Partner Visit Planning",
    status: "Draft",
    detail: "Fake internal planning trip, separate from partner ranger data.",
    meta: "22 Aug 2026",
  },
  {
    moduleSlug: "vehicles",
    organisationSlug: "demo-enarah-services",
    title: "Demo Enarah Pool Vehicle",
    status: "Available",
    detail: "Mock Enarah fleet record scoped to the internal organisation.",
    meta: "EN-DEMO-01",
  },
  {
    moduleSlug: "projects",
    organisationSlug: "demo-enarah-services",
    title: "Demo Partner Enablement Project",
    status: "Planning",
    detail: "Fake Enarah project for platform support and training.",
    meta: "DEMO-EN-001",
  },
  {
    moduleSlug: "people",
    organisationSlug: "demo-enarah-services",
    title: "Daryl Clarke - Demo",
    status: "Active",
    detail: "Fake Enarah admin profile for demo context switching.",
    meta: "Enarah Admin",
  },
  {
    moduleSlug: "fulcrum",
    organisationSlug: "demo-enarah-services",
    title: "Demo Fulcrum Support Checklist",
    status: "Offline",
    detail: "Fake internal Fulcrum planning surface with no connection.",
    meta: "0 synced records",
  },
  {
    moduleSlug: "reports",
    organisationSlug: "demo-enarah-services",
    title: "Demo Partner Support Summary",
    status: "Draft",
    detail: "Mock internal report separated from partner reports.",
    meta: "Monthly demo",
  },
  {
    moduleSlug: "compliance",
    organisationSlug: "demo-enarah-services",
    title: "Demo Support Access Review",
    status: "Scheduled",
    detail: "Fake compliance reminder for future permission checks.",
    meta: "No real permissions yet",
  },
];
