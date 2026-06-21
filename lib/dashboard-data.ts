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

export const moduleSlugs = navigationItems.map((item) => item.slug);

export function isModuleSlug(slug: string): slug is ModuleSlug {
  return moduleSlugs.some((moduleSlug) => moduleSlug === slug);
}

export const dashboardStats = [
  {
    label: "Upcoming trips",
    value: "2",
    caption: "Demo journeys awaiting final checks and ranger allocation.",
  },
  {
    label: "Vehicles tracked",
    value: "3",
    caption: "Placeholder fleet records with service and booking signals.",
  },
  {
    label: "Open reports",
    value: "4",
    caption: "Draft reporting surfaces for trips, projects and funders.",
  },
  {
    label: "Risks flagged",
    value: "2",
    caption: "Mock WHS and operational risks visible for dashboard testing.",
  },
] as const;

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

export const overviewActivity = [
  {
    title: "Demo trip draft created",
    description:
      "A fake ranger trip is shown as ready for itinerary and vehicle allocation.",
  },
  {
    title: "Vehicle pre-start placeholder added",
    description:
      "The dashboard reserves space for vehicle checks without storing real submissions.",
  },
  {
    title: "Fulcrum module marked offline",
    description:
      "The shell shows integration status only and does not request or display tokens.",
  },
] as const;

export function getModuleBySlug(
  slug: ModuleSlug,
): NavigationItem & { metrics: DashboardMetric[] } {
  const navigationItem = navigationItems.find((item) => item.slug === slug);

  return {
    ...(navigationItem ?? navigationItems[0]),
    metrics: getMetricsForModule(slug),
  };
}

function getMetricsForModule(slug: ModuleSlug) {
  const metricMap: Record<ModuleSlug, DashboardMetric[]> = {
    overview: [
      {
        label: "Demo modules",
        value: "11",
        caption: "Core ROPES navigation areas are represented.",
      },
      {
        label: "Integrations",
        value: "0",
        caption: "External services are intentionally disconnected.",
      },
      {
        label: "Secrets",
        value: "0",
        caption: "No API keys, tokens or credentials are included.",
      },
    ],
    organisations: [
      {
        label: "Demo tenants",
        value: "2",
        caption: "Enarah plus one fake partner organisation placeholder.",
      },
      {
        label: "Org switcher",
        value: "Later",
        caption: "Planned after authentication and memberships exist.",
      },
      {
        label: "Data scope",
        value: "Planned",
        caption: "All future operational data will be organisation-scoped.",
      },
    ],
    "ranger-operations": [
      {
        label: "Programs",
        value: "1",
        caption: "Fake ranger program placeholder for layout validation.",
      },
      {
        label: "Activities",
        value: "6",
        caption: "Demo activity count only, with no database behind it.",
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
        value: "2",
        caption: "Demo trip summaries for journey management planning.",
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
        value: "3",
        caption: "Fake vehicles matching the suggested demo dataset.",
      },
      {
        label: "Defects",
        value: "1",
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
        value: "1",
        caption: "One fake funded project for dashboard context.",
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
        value: "5",
        caption: "Fake staff and contractor count from the demo brief.",
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
        value: "0",
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
        value: "4",
        caption: "Demo report surfaces for trips, projects and funders.",
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
        value: "2",
        caption: "Fake WHS and operational risk signals.",
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
