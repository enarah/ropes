import {
  Activity,
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Clock3,
  DatabaseZap,
  FileText,
  MapPinned,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import {
  fakeCurrentSession,
  getDashboardStats,
  getModuleBySlug,
  getModuleRecords,
  getOverviewActivity,
  getSelectedOrganisation,
  isOperationalModule,
  modulePanels,
  type ModuleSlug,
} from "@/lib/dashboard-data";

const statIcons = [MapPinned, Truck, CalendarCheck, AlertTriangle];
const moduleIconMap = {
  overview: Activity,
  organisations: Users,
  "ranger-operations": MapPinned,
  trips: CalendarCheck,
  vehicles: Truck,
  projects: ClipboardList,
  people: Users,
  fulcrum: DatabaseZap,
  reports: FileText,
  compliance: ShieldCheck,
  settings: CheckCircle2,
} satisfies Record<ModuleSlug, typeof Activity>;

type DashboardContentProps = {
  moduleSlug: ModuleSlug;
  selectedOrganisationSlug?: string;
};

export function DashboardContent({
  moduleSlug,
  selectedOrganisationSlug,
}: DashboardContentProps) {
  const selectedOrganisation = getSelectedOrganisation(selectedOrganisationSlug);
  const activeModule = getModuleBySlug(moduleSlug, selectedOrganisation.slug);
  const ActiveIcon = moduleIconMap[moduleSlug];
  const isOverview = moduleSlug === "overview";
  const scopedRecords = getModuleRecords(moduleSlug, selectedOrganisation.slug);
  const overviewActivity = getOverviewActivity(selectedOrganisation.slug);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-earth-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-ochre-600 text-sand-50 shadow-sm">
            <ActiveIcon aria-hidden="true" size={20} strokeWidth={2.3} />
          </div>
          <p className="text-sm font-semibold text-ochre-700">
            {selectedOrganisation.name}
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-charcoal-950 md:text-4xl">
            {activeModule.label}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-charcoal-700">
            {activeModule.description}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:flex">
          <div className="rounded-md border border-earth-200 bg-white px-4 py-3">
            <p className="font-semibold text-charcoal-950">Active tenant</p>
            <p className="text-charcoal-600">{selectedOrganisation.type}</p>
          </div>
          <div className="rounded-md border border-earth-200 bg-white px-4 py-3">
            <p className="font-semibold text-charcoal-950">Fake session</p>
            <p className="text-charcoal-600">{fakeCurrentSession.user.name}</p>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-earth-200 bg-earth-50 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-charcoal-950">
              Selected organisation context
            </p>
            <p className="text-sm leading-6 text-charcoal-600">
              Showing fake records for {selectedOrganisation.name} only.
            </p>
          </div>
          <span className="w-fit rounded-md bg-white px-3 py-2 text-sm font-medium text-charcoal-700">
            {selectedOrganisation.region}
          </span>
        </div>
      </section>

      {isOverview ? (
        <OverviewStats organisationSlug={selectedOrganisation.slug} />
      ) : (
        <ModuleSnapshot
          moduleSlug={moduleSlug}
          organisationSlug={selectedOrganisation.slug}
        />
      )}

      <ScopedRecords
        moduleSlug={moduleSlug}
        organisationName={selectedOrganisation.name}
        records={scopedRecords}
      />

      <section aria-labelledby="module-panels-heading" className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              id="module-panels-heading"
              className="text-xl font-semibold text-charcoal-950"
            >
              Module panels
            </h2>
            <p className="text-sm text-charcoal-600">
              Placeholder surfaces for the first ROPES modules.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-md border border-ochre-200 bg-ochre-50 px-3 py-2 text-sm font-medium text-ochre-800">
            <Clock3 aria-hidden="true" size={16} />
            Foundation only
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modulePanels.map((panel) => {
            const PanelIcon = moduleIconMap[panel.slug];

            return (
              <article
                className="rounded-md border border-earth-200 bg-white p-5 shadow-sm"
                key={panel.slug}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-sand-200 text-charcoal-800">
                    <PanelIcon aria-hidden="true" size={20} />
                  </div>
                  <span className="rounded-md bg-earth-100 px-2.5 py-1 text-xs font-semibold text-charcoal-700">
                    {panel.status}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-charcoal-950">
                  {panel.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-charcoal-600">
                  {panel.summary}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section
        aria-labelledby="activity-heading"
        className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]"
      >
        <div className="rounded-md border border-earth-200 bg-white p-5 shadow-sm">
          <h2
            id="activity-heading"
            className="text-xl font-semibold text-charcoal-950"
          >
            Recent demo activity
          </h2>
          <div className="mt-4 divide-y divide-earth-100">
            {overviewActivity.map((item) => (
              <div className="flex gap-3 py-3" key={item.title}>
                <span className="mt-1 h-2.5 w-2.5 rounded-full bg-ochre-600" />
                <div>
                  <p className="font-medium text-charcoal-900">{item.title}</p>
                  <p className="text-sm leading-6 text-charcoal-600">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-earth-200 bg-charcoal-900 p-5 text-sand-50 shadow-sm">
          <h2 className="text-xl font-semibold">Security posture</h2>
          <p className="mt-3 text-sm leading-6 text-sand-100">
            This shell uses fake demo content only. Authentication, permissions,
            Fulcrum credentials and external syncs are intentionally absent from
            this milestone.
          </p>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sand-200">Authentication</dt>
              <dd className="font-semibold text-white">Not implemented</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sand-200">Fulcrum sync</dt>
              <dd className="font-semibold text-white">Not connected</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sand-200">Secrets</dt>
              <dd className="font-semibold text-white">None added</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}

function OverviewStats({
  organisationSlug,
}: {
  organisationSlug: Parameters<typeof getDashboardStats>[0];
}) {
  const dashboardStats = getDashboardStats(organisationSlug);

  return (
    <section
      aria-label="Demo dashboard summary"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {dashboardStats.map((stat, index) => {
        const StatIcon = statIcons[index];

        return (
          <article
            className="rounded-md border border-earth-200 bg-white p-5 shadow-sm"
            key={stat.label}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-charcoal-600">
                  {stat.label}
                </p>
                <p className="mt-2 text-3xl font-semibold text-charcoal-950">
                  {stat.value}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-earth-100 text-ochre-800">
                <StatIcon aria-hidden="true" size={20} />
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-charcoal-600">
              {stat.caption}
            </p>
          </article>
        );
      })}
    </section>
  );
}

function ModuleSnapshot({
  moduleSlug,
  organisationSlug,
}: {
  moduleSlug: ModuleSlug;
  organisationSlug: Parameters<typeof getModuleBySlug>[1];
}) {
  const activeModule = getModuleBySlug(moduleSlug, organisationSlug);

  return (
    <section
      aria-label={`${activeModule.label} placeholder status`}
      className="grid gap-4 md:grid-cols-3"
    >
      {activeModule.metrics.map((metric) => (
        <article
          className="rounded-md border border-earth-200 bg-white p-5 shadow-sm"
          key={metric.label}
        >
          <p className="text-sm font-medium text-charcoal-600">
            {metric.label}
          </p>
          <p className="mt-2 text-3xl font-semibold text-charcoal-950">
            {metric.value}
          </p>
          <p className="mt-3 text-sm leading-6 text-charcoal-600">
            {metric.caption}
          </p>
        </article>
      ))}
    </section>
  );
}

function ScopedRecords({
  moduleSlug,
  organisationName,
  records,
}: {
  moduleSlug: ModuleSlug;
  organisationName: string;
  records: ReturnType<typeof getModuleRecords>;
}) {
  const isOperational = isOperationalModule(moduleSlug);

  return (
    <section aria-labelledby="scoped-records-heading" className="space-y-4">
      <div>
        <h2
          className="text-xl font-semibold text-charcoal-950"
          id="scoped-records-heading"
        >
          {isOperational ? "Organisation-scoped mock data" : "Demo context"}
        </h2>
        <p className="text-sm leading-6 text-charcoal-600">
          {isOperational
            ? `These fake records are filtered to ${organisationName}.`
            : `This view is using the selected organisation: ${organisationName}.`}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {records.map((record) => (
          <article
            className="rounded-md border border-earth-200 bg-white p-5 shadow-sm"
            key={`${record.moduleSlug}-${record.title}`}
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-base font-semibold text-charcoal-950">
                {record.title}
              </h3>
              <span className="rounded-md bg-ochre-50 px-2.5 py-1 text-xs font-semibold text-ochre-800">
                {record.status}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-charcoal-600">
              {record.detail}
            </p>
            <p className="mt-4 text-xs font-semibold uppercase text-charcoal-600">
              {record.meta}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
