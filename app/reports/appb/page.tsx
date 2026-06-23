import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";
import { DisabledFeatureState } from "@/components/disabled-feature-state";
import { UnauthorisedState } from "@/components/unauthorised-state";
import { organisationHasCapability } from "@/lib/capability-registry";
import { getOrganisationPageAccess } from "@/lib/organisation-access";
import {
  buildAppbManualFieldDefinitions,
  buildAppbReportReadinessSummary,
  type AppbManualFieldDefinition,
} from "@/lib/appb-readiness";
import {
  appbFutureConcepts,
  appbGeneratedWorkbookPlaceholder,
  appbRopesDataSources,
  appbSourceTemplates,
  appbTemplateMappingSummary,
  appbTemplateProfiles,
  appbTemplateVersions,
} from "@/lib/appb-reporting";
import {
  type AppbReportOverview,
  getGrantsAppbOverview,
} from "@/lib/grants-appb-data";
import { upsertAppbManualFieldValueAction } from "./actions";

type AppbReportingPageProps = {
  searchParams?: Promise<{
    org?: string;
  }>;
};

export default async function AppbReportingPage({
  searchParams,
}: AppbReportingPageProps) {
  const selectedOrganisationSlug = (await searchParams)?.org;
  const access = await getOrganisationPageAccess(selectedOrganisationSlug);

  if (access.status === "denied") {
    return <UnauthorisedState {...access} />;
  }

  if (!organisationHasCapability(access.organisation.capabilityKeys, "reporting")) {
    return (
      <DisabledFeatureState
        capability="reporting"
        organisationName={access.organisation.name}
      />
    );
  }

  if (!organisationHasCapability(access.organisation.capabilityKeys, "reporting.appb")) {
    return (
      <DisabledFeatureState
        capability="reporting.appb"
        organisationName={access.organisation.name}
      />
    );
  }

  if (!organisationHasCapability(access.organisation.capabilityKeys, "grants")) {
    return (
      <DisabledFeatureState
        capability="grants"
        organisationName={access.organisation.name}
      />
    );
  }

  if (!organisationHasCapability(access.organisation.capabilityKeys, "grants.appb")) {
    return (
      <DisabledFeatureState
        capability="grants.appb"
        organisationName={access.organisation.name}
      />
    );
  }

  const overview = await getGrantsAppbOverview(access.organisation.slug);
  const reportingPeriodCount = overview.grants.reduce(
    (count, grant) => count + grant.reportingPeriods.length,
    0,
  );
  const appbReportCount = overview.grants.reduce(
    (count, grant) => count + grant.appbReportCount,
    0,
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-earth-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-ochre-700">
            Reporting / {access.organisation.name}
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-charcoal-950">
            APP&B reporting foundation
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal-700">
            Placeholder for future grant-scoped APP&B template mapping across
            multiple funders, program types, grants and reporting periods.
          </p>
        </div>
        <Link
          className="inline-flex items-center gap-2 rounded-md border border-earth-300 bg-white px-4 py-2 text-sm font-semibold text-charcoal-800"
          href={`/reports?org=${access.organisation.slug}`}
        >
          <FileSpreadsheet aria-hidden="true" size={16} />
          Reporting
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Grants" value={String(overview.grants.length)} />
        <SummaryCard label="Reporting periods" value={String(reportingPeriodCount)} />
        <SummaryCard label="APP&B reports" value={String(appbReportCount)} />
        <SummaryCard
          label="Template versions"
          value={String(appbTemplateMappingSummary.versionCount)}
        />
      </section>

      <Panel title="Grant APP&B records">
        {!overview.isDatabaseConfigured ? (
          <EmptyState message="Configure the database and enable APP&B capabilities to show persisted grant and report records." />
        ) : !overview.isDatabaseAvailable ? (
          <EmptyState message="ROPES could not confirm access to persisted APP&B records for this organisation." />
        ) : overview.grants.length === 0 ? (
          <EmptyState message="No grant records have been added for this organisation yet." />
        ) : (
          <div className="space-y-4">
            {overview.grants.map((grant) => (
              <article
                className="rounded-md border border-earth-200 bg-earth-50 p-4"
                key={grant.id}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-charcoal-950">
                      {grant.title}
                    </p>
                    <p className="mt-1 text-xs font-semibold uppercase text-ochre-700">
                      {grant.funder} / {grant.programType} / {grant.status}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-charcoal-600">
                      {grant.fundingPeriod}
                      {grant.fundingAgreementNumber
                        ? ` / ${grant.fundingAgreementNumber}`
                        : ""}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-charcoal-600">
                      {[grant.project, grant.rangerProgram].filter(Boolean).join(" / ")}
                    </p>
                  </div>
                  <span className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-charcoal-700">
                    {grant.appbReportCount} APP&B reports
                  </span>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {grant.reportingPeriods.map((period) => (
                    <div
                      className="rounded-md border border-earth-200 bg-white p-4"
                      key={period.id}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-charcoal-950">
                            {period.label}
                          </p>
                          <p className="mt-1 text-xs font-semibold uppercase text-charcoal-600">
                            {period.cycle} / {period.status}
                          </p>
                        </div>
                        {period.dueOn ? (
                          <span className="rounded-md bg-earth-50 px-2.5 py-1 text-xs font-semibold text-charcoal-700">
                            Due {period.dueOn}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-charcoal-600">
                        {period.dateRange}
                      </p>
                      <div className="mt-3 space-y-2">
                        {period.appbReports.length === 0 ? (
                          <p className="text-sm leading-6 text-charcoal-500">
                            No APP&B report instances for this period yet.
                          </p>
                        ) : (
                          period.appbReports.map((report) => {
                            const readiness = buildAppbReportReadinessSummary({
                              grant,
                              organisationName: access.organisation.name,
                              period,
                              report,
                            });
                            const manualFieldDefinitions =
                              buildAppbManualFieldDefinitions(report, period);

                            return (
                              <div
                                className="rounded-md bg-earth-50 p-3"
                                key={report.id}
                              >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <p className="text-sm font-semibold text-charcoal-950">
                                      {report.status}
                                    </p>
                                    <p className="mt-1 text-xs font-semibold uppercase text-charcoal-600">
                                      {report.templateProfileId} /{" "}
                                      {report.templateVersionLabel}
                                    </p>
                                  </div>
                                  <span className="rounded-md bg-charcoal-900 px-2.5 py-1 text-xs font-semibold uppercase text-sand-50">
                                    Export {readiness.exportStatus}
                                  </span>
                                </div>
                                {report.missingDataSummary ? (
                                  <p className="mt-2 text-sm leading-6 text-charcoal-600">
                                    {report.missingDataSummary}
                                  </p>
                                ) : null}
                                <ReadinessSummary summary={readiness} />
                                <ManualFieldSummary
                                  definitions={manualFieldDefinitions}
                                  organisationSlug={access.organisation.slug}
                                  report={report}
                                />
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Source template references">
        <div className="grid gap-3">
          {appbSourceTemplates.map((template) => (
            <article
              className="rounded-md border border-earth-200 bg-earth-50 p-4"
              key={template.fileName}
            >
              <p className="text-sm font-semibold text-charcoal-950">
                {template.fileName}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase text-ochre-700">
                {formatCycle(template.likelyCycle)}
              </p>
              <p className="mt-2 text-sm leading-6 text-charcoal-600">
                {template.notes}
              </p>
            </article>
          ))}
        </div>
      </Panel>

      <Panel title="Template mapping metadata">
        <div className="grid gap-3 md:grid-cols-4">
          <SummaryChip
            label="Sheets"
            value={String(appbTemplateMappingSummary.sheetCount)}
          />
          <SummaryChip
            label="Fields"
            value={String(appbTemplateMappingSummary.fieldCount)}
          />
          <SummaryChip
            label="Repeatable tables"
            value={String(appbTemplateMappingSummary.repeatableTableCount)}
          />
          <SummaryChip
            label="Blocked checks"
            value={String(appbTemplateMappingSummary.blockedReadinessChecks)}
          />
        </div>

        <div className="mt-4 space-y-3">
          {appbTemplateVersions.map((version) => (
            <article
              className="rounded-md border border-earth-200 bg-earth-50 p-4"
              key={version.id}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-charcoal-950">
                    {version.label}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase text-ochre-700">
                    {formatCycle(version.reportingCycle)} / {version.profileId}
                  </p>
                </div>
                <span className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-charcoal-700">
                  {version.sheets.length} sheets / {version.fields.length} fields
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-charcoal-600">
                {version.sourceTemplateFileName}
              </p>
              <p className="mt-2 text-sm leading-6 text-charcoal-600">
                {version.discoveryNotes}
              </p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {version.sheets.map((sheet) => (
                  <div className="rounded-md bg-white p-3" key={sheet.id}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-charcoal-950">
                        {sheet.name}
                      </p>
                      <span className="rounded-md bg-earth-50 px-2 py-1 text-xs font-semibold uppercase text-charcoal-600">
                        {sheet.state ?? "unknown"}
                      </span>
                    </div>
                    {sheet.dimensions ? (
                      <p className="mt-1 text-xs leading-5 text-charcoal-600">
                        {sheet.dimensions.rows} rows x{" "}
                        {sheet.dimensions.columns} columns /{" "}
                        {sheet.dimensions.formulaCellCount} formulas /{" "}
                        {sheet.dimensions.mergedRangeCount} merged ranges
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs leading-5 text-charcoal-600">
                      {sheet.protectionDetected
                        ? "Protection detected"
                        : "Protection not detected"}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {version.exportReadinessChecks.map((check) => (
                  <div
                    className="rounded-md bg-white p-3"
                    key={`${version.id}-${check.id}`}
                  >
                    <p className="text-xs font-semibold uppercase text-charcoal-600">
                      {check.status}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-charcoal-950">
                      {check.label}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </Panel>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Template profile placeholders">
          <div className="space-y-3">
            {appbTemplateProfiles.map((profile) => (
              <article
                className="rounded-md border border-earth-200 bg-earth-50 p-4"
                key={profile.id}
              >
                <p className="text-sm font-semibold text-charcoal-950">
                  {profile.funder} / {profile.id}
                </p>
                <p className="mt-2 text-sm leading-6 text-charcoal-600">
                  {profile.description}
                </p>
                <p className="mt-2 text-xs font-semibold uppercase text-charcoal-600">
                  {profile.programTypes.join(", ")}
                </p>
              </article>
            ))}
          </div>
        </Panel>

        <Panel title="Future data concepts">
          <div className="space-y-3">
            {appbFutureConcepts.map((concept) => (
              <div
                className="rounded-md border border-earth-200 bg-earth-50 p-4"
                key={concept.name}
              >
                <p className="text-sm font-semibold text-charcoal-950">
                  {concept.name}
                </p>
                <p className="mt-1 text-sm leading-6 text-charcoal-600">
                  {concept.description}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <Panel title="Current ROPES data fit">
        <div className="grid gap-3 md:grid-cols-2">
          {appbRopesDataSources.map((source) => (
            <article
              className="rounded-md border border-earth-200 bg-earth-50 p-4"
              key={source.model}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-charcoal-950">
                  {source.model}
                </p>
                <span className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-charcoal-700">
                  {source.currentStatus}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-charcoal-600">
                {source.appbUse}
              </p>
            </article>
          ))}
        </div>
      </Panel>

      <section className="rounded-md border border-earth-200 bg-charcoal-900 p-5 text-sand-50 shadow-sm">
        <p className="text-sm font-semibold text-sand-50">Boundary</p>
        <p className="mt-2 text-sm leading-6 text-sand-100">
          This page does not parse, store or generate XLSX workbooks. It is a
          capability-gated planning surface only; future implementation must
          keep reports scoped by organisation, grant and reporting period.
        </p>
        <p className="mt-2 text-sm leading-6 text-sand-100">
          {appbGeneratedWorkbookPlaceholder.description}{" "}
          {appbGeneratedWorkbookPlaceholder.reason}
        </p>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-md border border-earth-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-charcoal-600">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-charcoal-950">{value}</p>
    </article>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed border-earth-300 bg-earth-50 p-4">
      <p className="text-sm leading-6 text-charcoal-600">{message}</p>
    </div>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-earth-200 bg-earth-50 p-4">
      <p className="text-xs font-semibold uppercase text-charcoal-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-charcoal-950">{value}</p>
    </div>
  );
}

function ReadinessSummary({
  summary,
}: {
  summary: ReturnType<typeof buildAppbReportReadinessSummary>;
}) {
  const visibleCounts = summary.statusCounts.filter((count) => count.count > 0);

  return (
    <div className="mt-3 rounded-md border border-earth-200 bg-white p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-ochre-700">
            Readiness checklist
          </p>
          <p className="mt-1 text-sm font-semibold text-charcoal-950">
            Export blocked
          </p>
          {summary.templateVersion ? (
            <p className="mt-1 text-xs leading-5 text-charcoal-600">
              Matched to {summary.templateVersion.label}
            </p>
          ) : null}
        </div>
        <span className="rounded-md bg-earth-50 px-2.5 py-1 text-xs font-semibold text-charcoal-700">
          {summary.items.length} checks
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {visibleCounts.map((statusCount) => (
          <span
            className="rounded-md bg-earth-50 px-2.5 py-1 text-xs font-semibold text-charcoal-700"
            key={statusCount.status}
          >
            {formatStatus(statusCount.status)}: {statusCount.count}
          </span>
        ))}
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        {summary.topBlockers.slice(0, 3).map((item) => (
          <div
            className="rounded-md border border-earth-200 bg-earth-50 p-3"
            key={`${item.category}-${item.label}-${item.status}`}
          >
            <p className="text-xs font-semibold uppercase text-charcoal-600">
              {formatStatus(item.status)}
            </p>
            <p className="mt-1 text-sm font-semibold text-charcoal-950">
              {item.label}
            </p>
            <p className="mt-1 text-xs leading-5 text-charcoal-600">
              {item.reason}
            </p>
          </div>
        ))}
      </div>

      {summary.nextActions.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase text-charcoal-500">
            Next actions
          </p>
          <ul className="mt-2 space-y-1">
            {summary.nextActions.map((action) => (
              <li className="text-xs leading-5 text-charcoal-600" key={action}>
                {action}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ManualFieldSummary({
  definitions,
  organisationSlug,
  report,
}: {
  definitions: AppbManualFieldDefinition[];
  organisationSlug: string;
  report: AppbReportOverview;
}) {
  if (definitions.length === 0) {
    return null;
  }

  const enteredCount = report.manualFields.filter((field) =>
    ["Entered", "Reviewed", "Not Applicable"].includes(field.status),
  ).length;
  const statusCounts = countByStatus(report.manualFields.map((field) => field.status));
  const definitionById = new Map(
    definitions.map((definition) => [definition.fieldId, definition]),
  );
  const editableDefinitions = definitions.slice(0, 8);

  return (
    <div className="mt-3 rounded-md border border-earth-200 bg-white p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-ochre-700">
            Manual report fields
          </p>
          <p className="mt-1 text-sm font-semibold text-charcoal-950">
            {enteredCount} of {definitions.length} entered or reviewed
          </p>
          <p className="mt-1 text-xs leading-5 text-charcoal-600">
            Report-only values support readiness but do not make workbook export
            available.
          </p>
        </div>
        <span className="rounded-md bg-earth-50 px-2.5 py-1 text-xs font-semibold text-charcoal-700">
          Values hidden
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {statusCounts.length === 0 ? (
          <span className="rounded-md bg-earth-50 px-2.5 py-1 text-xs font-semibold text-charcoal-700">
            No manual values yet
          </span>
        ) : (
          statusCounts.map((count) => (
            <span
              className="rounded-md bg-earth-50 px-2.5 py-1 text-xs font-semibold text-charcoal-700"
              key={count.status}
            >
              {count.status}: {count.count}
            </span>
          ))
        )}
      </div>

      {report.manualFields.length > 0 ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {report.manualFields.slice(0, 4).map((field) => {
            const definition = definitionById.get(field.fieldId);

            return (
              <div
                className="rounded-md border border-earth-200 bg-earth-50 p-3"
                key={field.fieldId}
              >
                <p className="text-xs font-semibold uppercase text-charcoal-600">
                  {field.status} / {field.sensitivity}
                </p>
                <p className="mt-1 text-sm font-semibold text-charcoal-950">
                  {field.fieldLabel}
                </p>
                <p className="mt-1 text-xs leading-5 text-charcoal-600">
                  {formatStatus(definition?.fieldGroup ?? field.fieldGroup)}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}

      <form action={upsertAppbManualFieldValueAction} className="mt-3 space-y-3">
        <input name="organisationSlug" type="hidden" value={organisationSlug} />
        <input name="appbReportId" type="hidden" value={report.id} />
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-semibold text-charcoal-700">
            Field
            <select
              className="mt-1 w-full rounded-md border border-earth-300 bg-white px-3 py-2 text-sm text-charcoal-950"
              name="fieldId"
              required
            >
              {editableDefinitions.map((definition) => (
                <option key={definition.fieldId} value={definition.fieldId}>
                  {definition.fieldLabel}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-charcoal-700">
            Status
            <select
              className="mt-1 w-full rounded-md border border-earth-300 bg-white px-3 py-2 text-sm text-charcoal-950"
              name="status"
              required
            >
              <option value="DRAFT">Draft</option>
              <option value="ENTERED">Entered</option>
              <option value="NEEDS_REVIEW">Needs review</option>
              <option value="REVIEWED">Reviewed</option>
              <option value="NOT_APPLICABLE">Not applicable</option>
              <option value="BLANK">Blank</option>
            </select>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm font-semibold text-charcoal-700">
            Short text
            <input
              className="mt-1 w-full rounded-md border border-earth-300 bg-white px-3 py-2 text-sm text-charcoal-950"
              maxLength={500}
              name="valueText"
              placeholder="Stored, not shown in summaries"
            />
          </label>
          <label className="text-sm font-semibold text-charcoal-700">
            Number
            <input
              className="mt-1 w-full rounded-md border border-earth-300 bg-white px-3 py-2 text-sm text-charcoal-950"
              name="valueNumber"
              placeholder="Optional"
              step="0.01"
              type="number"
            />
          </label>
          <label className="text-sm font-semibold text-charcoal-700">
            Date
            <input
              className="mt-1 w-full rounded-md border border-earth-300 bg-white px-3 py-2 text-sm text-charcoal-950"
              name="valueDate"
              type="date"
            />
          </label>
        </div>

        <label className="block text-sm font-semibold text-charcoal-700">
          Safe note
          <textarea
            className="mt-1 min-h-20 w-full rounded-md border border-earth-300 bg-white px-3 py-2 text-sm text-charcoal-950"
            maxLength={300}
            name="notes"
            placeholder="Optional short report note; not shown in compact summaries"
          />
        </label>

        <button
          className="inline-flex rounded-md bg-charcoal-900 px-4 py-2 text-sm font-semibold text-sand-50"
          type="submit"
        >
          Save manual field
        </button>
      </form>
    </div>
  );
}

function Panel({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-md border border-earth-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-charcoal-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function formatCycle(cycle: string) {
  return cycle
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatStatus(status: string) {
  return status
    .split("-")
    .join(" ")
    .split("_")
    .join(" ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function countByStatus(statuses: string[]) {
  const counts = new Map<string, number>();

  for (const status of statuses) {
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }

  return [...counts.entries()].map(([status, count]) => ({
    count,
    status,
  }));
}
