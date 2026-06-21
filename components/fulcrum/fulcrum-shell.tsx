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
  fulcrumSections,
  getFulcrumAppsForOrganisation,
  getFulcrumConnectionsForOrganisation,
  getFulcrumRecordsForOrganisation,
  getFulcrumSection,
  getHealthChecksForOrganisation,
  getSyncSettingsForOrganisation,
  type FulcrumSectionSlug,
} from "@/lib/fulcrum-data";
import {
  AiAssistant,
  AppBuilder,
  AppsForms,
  Connections,
  DataHealth,
  FieldRecords,
  FulcrumOverview,
  Maps,
  SyncSettings,
} from "@/components/fulcrum/fulcrum-sections";
import { organisationHref } from "@/components/fulcrum/fulcrum-ui";

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
        <FulcrumOverview
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
