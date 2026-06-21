import {
  Bot,
  CheckCircle2,
  DatabaseZap,
  FileJson,
  Hammer,
  Map,
  PlugZap,
  ShieldAlert,
} from "lucide-react";
import {
  disableFulcrumConnectionAction,
  saveFulcrumConnectionAction,
  testFulcrumConnectionAction,
} from "@/app/fulcrum/actions";
import {
  appBuilderPreviewFields,
  assistantPrompts,
  getFulcrumSummary,
  type DemoFulcrumApp,
  type DemoFulcrumConnection,
  type DemoFulcrumRecord,
  type DemoHealthCheck,
  type DemoSyncSetting,
  type FulcrumConnectionState,
} from "@/lib/fulcrum-data";
import {
  CompactList,
  Fact,
  FieldList,
  formatDate,
  Panel,
} from "@/components/fulcrum/fulcrum-ui";

export function FulcrumOverview({
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

export function Connections({
  connectionState,
  connections,
  organisationName,
  organisationSlug,
}: {
  connectionState: FulcrumConnectionState;
  connections: DemoFulcrumConnection[];
  organisationName: string;
  organisationSlug: string;
}) {
  const primaryConnection = connections[0];

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="grid gap-4">
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
              <Fact
                label="Test state"
                value={getConnectionTestState(connection)}
              />
              <Fact label="Token hint" value={connection.tokenHint ?? "None"} />
              <Fact
                label="Security"
                value="Raw tokens are never displayed after save"
              />
            </dl>
            <p className="mt-4 text-sm leading-6 text-charcoal-600">
              {connection.note}
            </p>
            {connection.organisationId && connection.id !== "new-fulcrum-connection" ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <form action={testFulcrumConnectionAction}>
                  <input
                    name="organisationId"
                    type="hidden"
                    value={connection.organisationId}
                  />
                  <input
                    name="organisationSlug"
                    type="hidden"
                    value={organisationSlug}
                  />
                  <input
                    name="connectionId"
                    type="hidden"
                    value={connection.id}
                  />
                  <button
                    className="rounded-md bg-charcoal-900 px-3 py-2 text-sm font-semibold text-white"
                    type="submit"
                  >
                    Test connection
                  </button>
                </form>
                <form action={disableFulcrumConnectionAction}>
                  <input
                    name="organisationId"
                    type="hidden"
                    value={connection.organisationId}
                  />
                  <input
                    name="organisationSlug"
                    type="hidden"
                    value={organisationSlug}
                  />
                  <input
                    name="connectionId"
                    type="hidden"
                    value={connection.id}
                  />
                  <button
                    className="rounded-md border border-earth-300 bg-white px-3 py-2 text-sm font-semibold text-charcoal-800"
                    type="submit"
                  >
                    Disable connection
                  </button>
                </form>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <Panel icon={<PlugZap aria-hidden="true" size={18} />} title="Connection setup">
        <div className="rounded-md border border-earth-200 bg-earth-50 p-4">
          <p className="text-sm font-semibold text-charcoal-950">
            {organisationName}
          </p>
          <p className="mt-2 text-sm leading-6 text-charcoal-600">
            Save or replace an organisation-scoped Fulcrum API token. The token
            is encrypted server-side before storage and is not shown again.
          </p>
          <p className="mt-2 text-sm leading-6 text-charcoal-600">
            {getSetupStatus(connectionState)}
          </p>
        </div>
        <form action={saveFulcrumConnectionAction} className="mt-4 grid gap-4">
          <input
            name="organisationId"
            type="hidden"
            value={connectionState.organisationId ?? ""}
          />
          <input name="organisationSlug" type="hidden" value={organisationSlug} />
          <Field
            defaultValue={primaryConnection?.name ?? "Fulcrum API connection"}
            label="Connection name"
            name="connectionName"
          />
          <Field
            defaultValue={primaryConnection?.accountLabel ?? ""}
            label="Account label"
            name="accountLabel"
            placeholder="Example: Partner Fulcrum workspace"
          />
          <Field
            label="Fulcrum API token"
            name="apiToken"
            placeholder="Paste token to save or replace"
            type="password"
          />
          <button
            className="w-fit rounded-md bg-ochre-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!connectionState.isDatabaseAvailable}
            type="submit"
          >
            Save encrypted token
          </button>
        </form>
      </Panel>
    </section>
  );
}

function getConnectionTestState(connection: DemoFulcrumConnection) {
  if (connection.lastTestMessage) {
    return getTestMessageLabel(connection.lastTestMessage);
  }

  if (!connection.tokenHint) {
    return "Missing token";
  }

  return "Not tested";
}

function getTestMessageLabel(message: string) {
  const labels: Record<string, string> = {
    credentials_accepted: "Test passed",
    forbidden: "Test failed - forbidden",
    missing_encryption_key: "Missing encryption key",
    missing_token: "Missing token",
    network_error: "Test failed - network error",
    rate_limited: "Test failed - rate limited",
    token_decryption_failed: "Test failed - token could not be decrypted",
    unauthorized: "Test failed - token rejected",
    unexpected_response: "Test failed - unexpected response",
    upstream_unavailable: "Test failed - Fulcrum unavailable",
  };

  return labels[message] ?? "Test failed";
}

function Field({
  defaultValue,
  label,
  name,
  placeholder,
  type = "text",
}: {
  defaultValue?: string;
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-charcoal-800">{label}</span>
      <input
        className="mt-2 w-full rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600"
        defaultValue={defaultValue}
        name={name}
        placeholder={placeholder}
        required
        type={type}
      />
    </label>
  );
}

function getSetupStatus(connectionState: FulcrumConnectionState) {
  if (!connectionState.isDatabaseConfigured) {
    return "Local demo fallback is active because DATABASE_URL is not configured.";
  }

  if (!connectionState.isDatabaseAvailable) {
    return "The database is configured, but this organisation is not available.";
  }

  if (!connectionState.encryptionConfigured) {
    return "FULCRUM_TOKEN_ENCRYPTION_KEY is required before a token can be saved.";
  }

  return "Encryption is configured. Saving will update encrypted token storage only; it will not call Fulcrum.";
}

export function AppsForms({ apps }: { apps: DemoFulcrumApp[] }) {
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

export function FieldRecords({
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

export function Maps({
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

export function DataHealth({ checks }: { checks: DemoHealthCheck[] }) {
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

export function AiAssistant({ records }: { records: DemoFulcrumRecord[] }) {
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

export function AppBuilder() {
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

export function SyncSettings({ settings }: { settings: DemoSyncSetting[] }) {
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
