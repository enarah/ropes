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
import {
  getSelectedOrganisation,
  type DashboardOrganisation,
} from "@/lib/dashboard-data";
import {
  fulcrumSections,
  getFulcrumAppsForOrganisation,
  getFulcrumConnectionState,
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
  connectionError?: string;
  connectionSaved?: string;
  connectionTested?: string;
  organisation?: DashboardOrganisation;
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

export async function FulcrumShell({
  connectionError,
  connectionSaved,
  connectionTested,
  organisation: resolvedOrganisation,
  sectionSlug,
  selectedOrganisationSlug,
}: FulcrumShellProps) {
  const organisation =
    resolvedOrganisation ?? getSelectedOrganisation(selectedOrganisationSlug);
  const activeSection = getFulcrumSection(sectionSlug);
  const connectionState = await getFulcrumConnectionState(organisation.slug);
  const connections = connectionState.connections;
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
          <p className="text-charcoal-600">
            {connections[0]?.status ?? "Not connected"} /{" "}
            {connections[0]?.tokenHint ?? "no token saved"}
          </p>
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
          Showing Fulcrum setup for {organisation.name} only. Raw API tokens are
          never returned to the browser after save, and no Fulcrum sync or
          import calls run in this setup flow.
        </p>
      </section>

      {connectionError || connectionSaved || connectionTested ? (
        <ConnectionStatusMessage
          error={connectionError}
          saved={connectionSaved}
          tested={connectionTested}
        />
      ) : null}

      {activeSection.slug === "overview" ? (
        <FulcrumOverview
          apps={apps}
          healthChecks={healthChecks}
          organisationSlug={organisation.slug}
          records={records}
        />
      ) : null}
      {activeSection.slug === "connections" ? (
        <Connections
          connectionState={connectionState}
          connections={connections}
          organisationName={organisation.name}
          organisationSlug={organisation.slug}
        />
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

function ConnectionStatusMessage({
  error,
  saved,
  tested,
}: {
  error?: string;
  saved?: string;
  tested?: string;
}) {
  const title = error
    ? "Fulcrum connection was not saved"
    : tested
      ? getTestStatusTitle(tested)
      : saved === "disabled"
        ? "Fulcrum connection disabled"
        : saved === "demo"
          ? "Demo fallback"
          : "Fulcrum connection saved";

  return (
    <section className="rounded-md border border-earth-200 bg-white p-4">
      <p className="text-sm font-semibold text-charcoal-950">{title}</p>
      <p className="mt-1 text-sm leading-6 text-charcoal-600">
        {getConnectionStatusMessage({ error, saved, tested })}
      </p>
    </section>
  );
}

function getConnectionStatusMessage({
  error,
  saved,
  tested,
}: {
  error?: string;
  saved?: string;
  tested?: string;
}) {
  if (tested) {
    return getTestStatusMessage(tested);
  }

  if (saved === "demo") {
    return "No local database is configured, so the Fulcrum setup form remains demo-only.";
  }

  if (saved === "disabled") {
    return "Encrypted token storage was cleared for this organisation. No Fulcrum API call was made.";
  }

  if (!error) {
    return "The token was encrypted and stored server-side. The raw token is not displayed again.";
  }

  if (error === "encryption") {
    return "FULCRUM_TOKEN_ENCRYPTION_KEY is required before a token can be saved.";
  }

  if (error === "tenant") {
    return "The signed-in user does not have an active membership for this organisation.";
  }

  if (error === "validation") {
    return "The organisation, connection or token input was missing or invalid.";
  }

  return "The database write was rejected before anything was saved.";
}

function getTestStatusTitle(tested: string) {
  if (tested === "passed") {
    return "Fulcrum connection test passed";
  }

  if (tested === "missing-token") {
    return "Fulcrum connection is missing a token";
  }

  if (tested === "missing_encryption_key") {
    return "Fulcrum encryption key is missing";
  }

  return "Fulcrum connection test failed";
}

function getTestStatusMessage(tested: string) {
  const messages: Record<string, string> = {
    forbidden:
      "Fulcrum rejected the request because the token does not have access to the tested account.",
    missing_encryption_key:
      "FULCRUM_TOKEN_ENCRYPTION_KEY is required before saved tokens can be decrypted for testing.",
    "missing-token":
      "Save an encrypted Fulcrum API token before testing this connection.",
    network_error:
      "ROPES could not reach Fulcrum for the credential test. No record sync was attempted.",
    passed:
      "Fulcrum accepted the credential test. ROPES updated safe connection metadata only; no records were synced.",
    rate_limited:
      "Fulcrum rate-limited the credential test. Try again later; no records were synced.",
    token_decryption_failed:
      "ROPES could not decrypt the saved token. Save a new token before testing again.",
    unauthorized:
      "Fulcrum rejected the saved token. Save an updated token before testing again.",
    unexpected_response:
      "Fulcrum returned an unexpected response category. No response payload was stored.",
    upstream_unavailable:
      "Fulcrum appears unavailable. ROPES stored only the safe failure category.",
  };

  return messages[tested] ?? "ROPES stored a safe failure category only.";
}
