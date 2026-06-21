import Link from "next/link";
import {
  Bot,
  CheckCircle2,
  DatabaseZap,
  FileJson,
  Hammer,
  Map,
  PlugZap,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { getSelectedOrganisation } from "@/lib/dashboard-data";
import {
  appBuilderPreviewFields,
  assistantPrompts,
  fulcrumSections,
  getFulcrumAppsForOrganisation,
  getFulcrumConnectionsForOrganisation,
  getFulcrumRecordsForOrganisation,
  getFulcrumSection,
  getFulcrumSummary,
  getHealthChecksForOrganisation,
  getSyncSettingsForOrganisation,
  type DemoFulcrumApp,
  type DemoFulcrumConnection,
  type DemoFulcrumRecord,
  type DemoHealthCheck,
  type DemoSyncSetting,
  type FulcrumSectionSlug,
} from "@/lib/fulcrum-data";

type FulcrumShellProps = {
  sectionSlug?: string;
  selectedOrganisationSlug?: string;
};

const sectionIcons = {
  overview: DatabaseZap,
  connections: PlugZap,
  "apps-forms": FileJson,
  "field-records": CheckCircle2,
  maps: Map,
  "data-health": ShieldAlert,
  "ai-assistant": Bot,
  "app-builder": Hammer,
  "sync-settings": RefreshCw,
} satisfies Record<FulcrumSectionSlug, typeof DatabaseZap>;

export function FulcrumShell({
  sectionSlug,
  selectedOrganisationSlug,
}: FulcrumShellProps) {
  const organisation = getSelectedOrganisation(selectedOrganisationSlug);
  const activeSection = getFulcrumSection(sectionSlug);
  const connections = getFulcrumConnectionsForOrganisation(organisation.slug);
  const apps = getFulcrumAppsForOrganisation(organisation.slug);
  const records = getFulcrumRecordsForOrganisation(organisation.slug);
  const healthChecks = getHealthChecksForOrganisation(organisation.slug);
  const syncSettings = getSyncSettingsForOrganisation(organisation.slug);
  const ActiveIcon = sectionIcons[activeSection.slug];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-earth-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-ochre-700">
            Fulcrum / {organisation.name}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-ochre-600 text-white">
              <ActiveIcon aria-hidden="true" size={20} />
            </div>
            <h1 className="text-3xl font-semibold text-charcoal-950 md:text-4xl">
              {activeSection.slug === "overview"
                ? "Fulcrum Overview"
                : activeSection.label}
            </h1>
          </div>
          <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal-700">
            {activeSection.description} This shell uses demo data only and does
            not call Fulcrum.
          </p>
        </div>
        <div className="rounded-md border border-earth-200 bg-white px-4 py-3 text-sm">
          <p className="font-semibold text-charcoal-950">Fulcrum API</p>
          <p className="text-charcoal-600">Not connected / no tokens stored</p>
        </div>
      </section>

      <nav
        aria-label="Fulcrum pages"
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
      >
        {fulcrumSections.map((section) => {
          const Icon = sectionIcons[section.slug];
          const isActive = section.slug === activeSection.slug;

          return (
            <Link
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${
                isActive
                  ? "border-ochre-600 bg-ochre-600 text-white"
                  : "border-earth-200 bg-white text-charcoal-700"
              }`}
              href={organisationHref(section.href, organisation.slug)}
              key={section.slug}
            >
              <Icon aria-hidden="true" size={16} />
              {section.label}
            </Link>
          );
        })}
      </nav>

      <section className="rounded-md border border-earth-200 bg-earth-50 p-4">
        <p className="text-sm font-semibold text-charcoal-950">
          Selected organisation context
        </p>
        <p className="text-sm leading-6 text-charcoal-600">
          Showing fake Fulcrum records for {organisation.name} only. No
          cross-organisation Fulcrum data, credentials or API responses are
          included.
        </p>
      </section>

      {activeSection.slug === "overview" ? (
        <Overview
          apps={apps}
          healthChecks={healthChecks}
          organisationSlug={organisation.slug}
          records={records}
        />
      ) : null}
      {activeSection.slug === "connections" ? (
        <Connections connections={connections} />
      ) : null}
      {activeSection.slug === "apps-forms" ? <AppsForms apps={apps} /> : null}
      {activeSection.slug === "field-records" ? (
        <FieldRecords apps={apps} records={records} />
      ) : null}
      {activeSection.slug === "maps" ? (
        <Maps apps={apps} records={records} />
      ) : null}
      {activeSection.slug === "data-health" ? (
        <DataHealth checks={healthChecks} />
      ) : null}
      {activeSection.slug === "ai-assistant" ? (
        <AiAssistant records={records} />
      ) : null}
      {activeSection.slug === "app-builder" ? <AppBuilder /> : null}
      {activeSection.slug === "sync-settings" ? (
        <SyncSettings settings={syncSettings} />
      ) : null}
    </div>
  );
}

function Overview({
  apps,
  healthChecks,
  organisationSlug,
  records,
}: {
  apps: DemoFulcrumApp[];
  healthChecks: DemoHealthCheck[];
  organisationSlug: Parameters<typeof getFulcrumSummary>[0];
  records: DemoFulcrumRecord[];
}) {
  const summary = getFulcrumSummary(organisationSlug);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <article
            className="rounded-md border border-earth-200 bg-white p-5 shadow-sm"
            key={item.label}
          >
            <p className="text-sm font-medium text-charcoal-600">
              {item.label}
            </p>
            <p className="mt-2 text-3xl font-semibold text-charcoal-950">
              {item.value}
            </p>
            <p className="mt-3 text-sm leading-6 text-charcoal-600">
              {item.caption}
            </p>
          </article>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel icon={<FileJson aria-hidden="true" size={18} />} title="Apps">
          <CompactList
            rows={apps.map((app) => ({
              meta: `${app.recordCount} fake records`,
              status: app.lastSynced,
              title: app.name,
            }))}
          />
        </Panel>
        <Panel
          icon={<ShieldAlert aria-hidden="true" size={18} />}
          title="Data health"
        >
          <CompactList
            rows={healthChecks.map((check) => ({
              meta: check.detail,
              status: check.status,
              title: check.title,
            }))}
          />
        </Panel>
      </section>
      <FieldRecords apps={apps} records={records} compact />
    </div>
  );
}

function Connections({
  connections,
}: {
  connections: DemoFulcrumConnection[];
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {connections.map((connection) => (
        <article
          className="rounded-md border border-earth-200 bg-white p-5 shadow-sm"
          key={connection.id}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-charcoal-950">
                {connection.name}
              </h2>
              <p className="mt-2 text-sm text-charcoal-600">
                {connection.accountLabel}
              </p>
            </div>
            <span className="rounded-md bg-earth-100 px-2.5 py-1 text-xs font-semibold text-charcoal-700">
              {connection.status}
            </span>
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            <Fact label="Last checked" value={connection.lastChecked} />
            <Fact label="Security" value="No token fields in this shell" />
          </dl>
          <p className="mt-4 text-sm leading-6 text-charcoal-600">
            {connection.note}
          </p>
        </article>
      ))}
    </section>
  );
}

function AppsForms({ apps }: { apps: DemoFulcrumApp[] }) {
  return (
    <section className="grid gap-4">
      {apps.map((app) => (
        <article
          className="rounded-md border border-earth-200 bg-white p-5 shadow-sm"
          key={app.id}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-charcoal-950">
                {app.name}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-charcoal-600">
                {app.purpose}
              </p>
            </div>
            <span className="w-fit rounded-md bg-ochre-50 px-2.5 py-1 text-xs font-semibold text-ochre-800">
              {app.recordCount} fake records
            </span>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <FieldList label="Fields" values={app.fields} />
            <FieldList label="Required fields" values={app.requiredFields} />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase text-charcoal-600">
            {app.project} / {app.lastSynced}
          </p>
        </article>
      ))}
    </section>
  );
}

function FieldRecords({
  apps,
  compact = false,
  records,
}: {
  apps: DemoFulcrumApp[];
  compact?: boolean;
  records: DemoFulcrumRecord[];
}) {
  return (
    <Panel
      icon={<CheckCircle2 aria-hidden="true" size={18} />}
      title={compact ? "Recent field records" : "Field Records"}
    >
      <div className="divide-y divide-earth-100">
        {records.map((record) => {
          const app = apps.find((item) => item.id === record.appId);

          return (
            <div
              className="grid gap-3 py-3 md:grid-cols-[1fr_12rem_9rem] md:items-center"
              key={record.id}
            >
              <div>
                <p className="font-medium text-charcoal-950">{record.title}</p>
                <p className="text-sm text-charcoal-600">
                  {app?.name ?? "Unknown demo app"} / {record.createdBy}
                </p>
              </div>
              <p className="text-sm text-charcoal-600">
                {formatDate(record.recordedAt)}
              </p>
              <span className="w-fit rounded-md bg-earth-100 px-2.5 py-1 text-xs font-semibold text-charcoal-700">
                {record.status}
              </span>
              {!compact ? (
                <p className="md:col-span-3 text-sm text-charcoal-600">
                  {record.location} / {record.project}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function Maps({
  apps,
  records,
}: {
  apps: DemoFulcrumApp[];
  records: DemoFulcrumRecord[];
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="min-h-96 rounded-md border border-earth-200 bg-sand-200 p-5 shadow-sm">
        <div className="flex h-full min-h-80 items-center justify-center rounded-md border border-dashed border-earth-400 bg-sand-100 text-center">
          <div>
            <Map
              aria-hidden="true"
              className="mx-auto text-ochre-800"
              size={34}
            />
            <h2 className="mt-3 text-xl font-semibold text-charcoal-950">
              Demo map placeholder
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-charcoal-600">
              Future map layers will show synced record locations, project
              areas and trip context after the Fulcrum connector exists.
            </p>
          </div>
        </div>
      </div>
      <Panel icon={<FileJson aria-hidden="true" size={18} />} title="Map layers">
        <CompactList
          rows={[
            {
              title: "Field records",
              meta: `${records.length} fake record markers`,
              status: "Demo",
            },
            {
              title: "Apps",
              meta: `${apps.length} fake app filters`,
              status: "Demo",
            },
            {
              title: "Project areas",
              meta: "Placeholder boundaries only",
              status: "Later",
            },
          ]}
        />
      </Panel>
    </section>
  );
}

function DataHealth({ checks }: { checks: DemoHealthCheck[] }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {checks.map((check) => (
        <article
          className="rounded-md border border-earth-200 bg-white p-5 shadow-sm"
          key={check.id}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-charcoal-600">
                {check.title}
              </p>
              <p className="mt-2 text-3xl font-semibold text-charcoal-950">
                {check.count}
              </p>
            </div>
            <span className="rounded-md bg-earth-100 px-2.5 py-1 text-xs font-semibold text-charcoal-700">
              {check.status}
            </span>
          </div>
          <p className="mt-4 text-sm leading-6 text-charcoal-600">
            {check.detail}
          </p>
        </article>
      ))}
    </section>
  );
}

function AiAssistant({ records }: { records: DemoFulcrumRecord[] }) {
  return (
    <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <Panel icon={<Bot aria-hidden="true" size={18} />} title="Prompt ideas">
        <div className="grid gap-2">
          {assistantPrompts.map((prompt) => (
            <button
              className="rounded-md border border-earth-200 bg-earth-50 px-3 py-2 text-left text-sm font-medium text-charcoal-800"
              key={prompt}
              type="button"
            >
              {prompt}
            </button>
          ))}
        </div>
      </Panel>
      <Panel icon={<DatabaseZap aria-hidden="true" size={18} />} title="Mock answer">
        <p className="text-sm leading-6 text-charcoal-600">
          The assistant is a non-functional demo shell. It does not call an AI
          provider. Later it would search {records.length} fake
          organisation-scoped Fulcrum record{records.length === 1 ? "" : "s"}{" "}
          and return source-linked answers after permissions, synced data and
          AI integration are added.
        </p>
      </Panel>
    </section>
  );
}

function AppBuilder() {
  return (
    <Panel icon={<Hammer aria-hidden="true" size={18} />} title="Design preview">
      <p className="mb-4 text-sm leading-6 text-charcoal-600">
        This shell previews a future Fulcrum form design only. It does not
        create or update Fulcrum apps.
      </p>
      <div className="grid gap-3">
        {appBuilderPreviewFields.map((field) => (
          <div
            className="grid gap-2 rounded-md border border-earth-200 bg-earth-50 p-3 md:grid-cols-[1fr_8rem_9rem_1fr]"
            key={field.name}
          >
            <p className="font-medium text-charcoal-950">{field.name}</p>
            <p className="text-sm text-charcoal-600">{field.type}</p>
            <p className="text-sm text-charcoal-600">{field.required}</p>
            <p className="text-sm text-charcoal-600">{field.note}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function SyncSettings({ settings }: { settings: DemoSyncSetting[] }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {settings.map((setting) => (
        <article
          className="rounded-md border border-earth-200 bg-white p-5 shadow-sm"
          key={setting.id}
        >
          <p className="text-sm font-medium text-charcoal-600">
            {setting.label}
          </p>
          <p className="mt-2 text-xl font-semibold text-charcoal-950">
            {setting.value}
          </p>
          <p className="mt-3 text-sm leading-6 text-charcoal-600">
            {setting.note}
          </p>
        </article>
      ))}
    </section>
  );
}

function Panel({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-md border border-earth-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-charcoal-950">
        {icon}
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function CompactList({
  rows,
}: {
  rows: Array<{ meta: string; status: string; title: string }>;
}) {
  return (
    <div className="divide-y divide-earth-100">
      {rows.map((row) => (
        <div
          className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between"
          key={`${row.title}-${row.meta}`}
        >
          <div>
            <p className="font-medium text-charcoal-950">{row.title}</p>
            <p className="text-sm text-charcoal-600">{row.meta}</p>
          </div>
          <span className="w-fit rounded-md bg-earth-100 px-2.5 py-1 text-xs font-semibold text-charcoal-700">
            {row.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function FieldList({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="rounded-md bg-sand-100 p-4">
      <p className="text-sm font-semibold text-charcoal-950">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((value) => (
          <span
            className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-charcoal-700"
            key={value}
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-charcoal-600">{label}</dt>
      <dd className="text-right font-semibold text-charcoal-950">{value}</dd>
    </div>
  );
}

function organisationHref(pathname: string, organisationSlug: string) {
  return `${pathname}?org=${organisationSlug}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
