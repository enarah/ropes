import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";
import { DisabledFeatureState } from "@/components/disabled-feature-state";
import { UnauthorisedState } from "@/components/unauthorised-state";
import { APPB_MAPPING_REVIEW_HISTORY_DEFAULT_EVENT_LIMIT } from "@/lib/appb-mapping-review-history";
import { organisationHasCapability } from "@/lib/capability-registry";
import { getOrganisationPageAccess } from "@/lib/organisation-access";
import {
  buildAppbManualFieldDefinitions,
  buildAppbReportReadinessSummary,
  findAppbTemplateVersion,
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
  buildAppbMappingReviewSummary,
  buildAppbMappingReviews,
  buildAppbRepeatableRangeSummary,
  buildAppbWorkbookRangeMappingSummary,
  type AppbMappingReview,
  type AppbPersistedMappingReview,
  type AppbTemplateVersion,
} from "@/lib/appb-reporting";
import {
  type AppbManualFieldOverview,
  type AppbReportOverview,
  getGrantsAppbOverview,
} from "@/lib/grants-appb-data";
import {
  saveAppbMappingReviewDecisionAction,
  upsertAppbManualFieldValueAction,
} from "./actions";
import {
  AppbMappingReviewHistoryLoadMore,
  MappingReviewDecisionVersionList,
} from "./mapping-review-history-load-more";

type AppbReportingPageProps = {
  searchParams?: Promise<{
    error?: string;
    org?: string;
    saved?: string;
  }>;
};

export default async function AppbReportingPage({
  searchParams,
}: AppbReportingPageProps) {
  const resolvedSearchParams = await searchParams;
  const selectedOrganisationSlug = resolvedSearchParams?.org;
  const statusMessage = appbStatusMessage(resolvedSearchParams);
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

      {statusMessage ? <StatusBanner {...statusMessage} /> : null}

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
                            const templateVersion = findAppbTemplateVersion(
                              report,
                              period,
                            );

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
                                {templateVersion ? (
                                  <>
                                    <RangeMappingSummary
                                      persistedReviews={report.mappingReviews}
                                      templateVersion={templateVersion}
                                    />
                                    <RepeatableRangeSummary
                                      persistedReviews={report.mappingReviews}
                                      templateVersion={templateVersion}
                                    />
                                    <MappingReviewSummary
                                      persistedReviews={report.mappingReviews}
                                      templateVersion={templateVersion}
                                    />
                                    <MappingReviewPanel
                                      organisationSlug={access.organisation.slug}
                                      persistedReviews={report.mappingReviews}
                                      reportId={report.id}
                                      templateVersion={templateVersion}
                                    />
                                  </>
                                ) : null}
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
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
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
            value={String(
              appbTemplateMappingSummary.repeatableRangeDefinitionCount,
            )}
          />
          <SummaryChip
            label="Range mappings"
            value={String(appbTemplateMappingSummary.rangeMappingCount)}
          />
          <SummaryChip
            label="Needs review"
            value={String(appbTemplateMappingSummary.rangeMappingNeedsReviewCount)}
          />
          <SummaryChip
            label="Review items"
            value={String(appbTemplateMappingSummary.mappingReviewCount)}
          />
          <SummaryChip
            label="Review blocked"
            value={String(appbTemplateMappingSummary.mappingReviewBlockedCount)}
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
              <RangeMappingSummary templateVersion={version} />
              <RepeatableRangeSummary templateVersion={version} />
              <MappingReviewSummary templateVersion={version} />
              <MappingReviewPanel templateVersion={version} />
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

function StatusBanner({
  message,
  tone,
}: {
  message: string;
  tone: "error" | "success";
}) {
  return (
    <div
      className={
        tone === "error"
          ? "rounded-md border border-ochre-300 bg-ochre-50 p-4"
          : "rounded-md border border-earth-300 bg-earth-50 p-4"
      }
    >
      <p className="text-sm leading-6 text-charcoal-700">{message}</p>
    </div>
  );
}

function appbStatusMessage(
  searchParams:
    | {
        error?: string;
        saved?: string;
      }
    | undefined,
) {
  if (searchParams?.error === "note-safety") {
    return {
      message:
        "Review note was not saved. Use a short metadata-only note without workbook values, financial figures, personal details, private links or report narrative.",
      tone: "error" as const,
    };
  }

  if (searchParams?.saved === "mapping-review") {
    return {
      message:
        "Mapping review decision saved. Workbook export remains blocked.",
      tone: "success" as const,
    };
  }

  return null;
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

function RangeMappingSummary({
  persistedReviews = [],
  templateVersion,
}: {
  persistedReviews?: AppbPersistedMappingReview[];
  templateVersion: AppbTemplateVersion;
}) {
  const summary = buildAppbWorkbookRangeMappingSummary(
    templateVersion,
    persistedReviews,
  );
  const visibleCounts = summary.statusCounts.filter((count) => count.count > 0);

  return (
    <div className="mt-3 rounded-md border border-earth-200 bg-white p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-ochre-700">
            Exact range mappings
          </p>
          <p className="mt-1 text-sm font-semibold text-charcoal-950">
            {summary.unresolvedCount} of {summary.total} need review or are blocked
          </p>
          <p className="mt-1 text-xs leading-5 text-charcoal-600">
            Counts only. Export remains blocked until exact workbook targets and
            export rules are implemented.
          </p>
        </div>
        <span className="rounded-md bg-charcoal-900 px-2.5 py-1 text-xs font-semibold uppercase text-sand-50">
          Export blocked
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
    </div>
  );
}

function RepeatableRangeSummary({
  persistedReviews = [],
  templateVersion,
}: {
  persistedReviews?: AppbPersistedMappingReview[];
  templateVersion: AppbTemplateVersion;
}) {
  const summary = buildAppbRepeatableRangeSummary(
    templateVersion,
    persistedReviews,
  );
  const visibleStatuses = summary.statusCounts.filter((count) => count.count > 0);
  const visibleRules = summary.expansionRuleCounts.filter(
    (count) => count.count > 0,
  );

  if (summary.total === 0) {
    return null;
  }

  return (
    <div className="mt-3 rounded-md border border-earth-200 bg-white p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-ochre-700">
            Repeatable table ranges
          </p>
          <p className="mt-1 text-sm font-semibold text-charcoal-950">
            {summary.unresolvedCount} of {summary.total} need review or are blocked
          </p>
          <p className="mt-1 text-xs leading-5 text-charcoal-600">
            Header, data, total/formula and manual-only row groups are tracked
            as metadata only. Export remains blocked.
          </p>
        </div>
        <span className="rounded-md bg-earth-50 px-2.5 py-1 text-xs font-semibold text-charcoal-700">
          Manual-only: {summary.manualOnlyCount}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {visibleStatuses.map((statusCount) => (
          <span
            className="rounded-md bg-earth-50 px-2.5 py-1 text-xs font-semibold text-charcoal-700"
            key={statusCount.status}
          >
            {formatStatus(statusCount.status)}: {statusCount.count}
          </span>
        ))}
        {visibleRules.map((ruleCount) => (
          <span
            className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-ochre-700"
            key={ruleCount.expansionRule}
          >
            {formatStatus(ruleCount.expansionRule)}: {ruleCount.count}
          </span>
        ))}
      </div>
    </div>
  );
}

function MappingReviewSummary({
  persistedReviews = [],
  templateVersion,
}: {
  persistedReviews?: AppbPersistedMappingReview[];
  templateVersion: AppbTemplateVersion;
}) {
  const summary = buildAppbMappingReviewSummary(
    templateVersion,
    persistedReviews,
  );
  const visibleStatuses = summary.statusCounts.filter((count) => count.count > 0);
  const visibleTargets = summary.targetCounts.filter((count) => count.count > 0);

  if (summary.total === 0) {
    return null;
  }

  return (
    <div className="mt-3 rounded-md border border-earth-200 bg-white p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-ochre-700">
            Mapping review workflow
          </p>
          <p className="mt-1 text-sm font-semibold text-charcoal-950">
            {summary.needsReviewCount} need review / {summary.blockedCount} blocked
          </p>
          <p className="mt-1 text-xs leading-5 text-charcoal-600">
            Review decisions are metadata-only and value-free. Marking a mapping
            reviewed does not enable workbook export.
          </p>
        </div>
        <span className="rounded-md bg-charcoal-900 px-2.5 py-1 text-xs font-semibold uppercase text-sand-50">
          Export blocked
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {visibleStatuses.map((statusCount) => (
          <span
            className="rounded-md bg-earth-50 px-2.5 py-1 text-xs font-semibold text-charcoal-700"
            key={statusCount.status}
          >
            {formatStatus(statusCount.status)}: {statusCount.count}
          </span>
        ))}
        {visibleTargets.map((targetCount) => (
          <span
            className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-ochre-700"
            key={targetCount.targetKind}
          >
            {formatStatus(targetCount.targetKind)}: {targetCount.count}
          </span>
        ))}
      </div>
    </div>
  );
}

function MappingReviewPanel({
  organisationSlug,
  persistedReviews = [],
  reportId,
  templateVersion,
}: {
  organisationSlug?: string;
  persistedReviews?: AppbPersistedMappingReview[];
  reportId?: string;
  templateVersion: AppbTemplateVersion;
}) {
  const reviews = buildAppbMappingReviews(templateVersion, persistedReviews);
  const fieldReviews = reviews.filter(
    (review) => review.targetKind === "field-mapping",
  );
  const repeatableReviews = reviews.filter(
    (review) => review.targetKind === "repeatable-range",
  );
  const saveContext =
    organisationSlug && reportId
      ? { organisationSlug, reportId, templateVersionId: templateVersion.id }
      : undefined;

  if (reviews.length === 0) {
    return null;
  }

  return (
    <details className="mt-3 rounded-md border border-earth-200 bg-white p-3">
      <summary className="cursor-pointer text-sm font-semibold text-charcoal-950">
        Review mapping metadata
      </summary>
      <p className="mt-2 text-xs leading-5 text-charcoal-600">
        Metadata-only review panel. It shows labels, statuses, decisions and safe
        notes only; workbook values and manual report values stay hidden.
      </p>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <MappingReviewList
          reviews={fieldReviews}
          saveContext={saveContext}
          title="Field mappings"
        />
        <MappingReviewList
          reviews={repeatableReviews}
          saveContext={saveContext}
          title="Repeatable ranges"
        />
      </div>
    </details>
  );
}

function MappingReviewList({
  reviews,
  saveContext,
  title,
}: {
  reviews: AppbMappingReview[];
  saveContext?: {
    organisationSlug: string;
    reportId: string;
    templateVersionId: string;
  };
  title: string;
}) {
  return (
    <section className="rounded-md border border-earth-200 bg-earth-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-charcoal-950">{title}</p>
        <span className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-charcoal-700">
          {reviews.length}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {reviews.length === 0 ? (
          <p className="text-xs leading-5 text-charcoal-600">
            No review records for this category.
          </p>
        ) : (
          reviews.map((review) => (
            <article
              className="rounded-md border border-earth-200 bg-white p-3"
              key={review.id}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-charcoal-950">
                    {review.label}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase text-charcoal-600">
                    {formatStatus(review.targetKind)} /{" "}
                    {formatStatus(review.decision)}
                  </p>
                </div>
                <span className="rounded-md bg-earth-50 px-2.5 py-1 text-xs font-semibold text-charcoal-700">
                  {formatStatus(review.status)}
                </span>
              </div>
              {review.note ? (
                <p className="mt-2 text-xs leading-5 text-charcoal-600">
                  {review.note.text}
                </p>
              ) : null}
              <p className="mt-2 text-xs leading-5 text-charcoal-600">
                {review.reviewer?.displayName
                  ? `Reviewed by ${review.reviewer.displayName}`
                  : "Reviewer identity is saved when a report-scoped decision is persisted."}
                {review.reviewedAt ? ` / ${formatReviewDate(review.reviewedAt)}` : ""}
                . Export remains blocked.
              </p>
              <MappingReviewHistoryDisplay
                loadMoreContext={saveContext}
                review={review}
              />
              {saveContext ? (
                <MappingReviewDecisionForm
                  review={review}
                  saveContext={saveContext}
                />
              ) : (
                <p className="mt-2 text-xs leading-5 text-charcoal-600">
                  Open a report-specific review panel to persist decisions.
                </p>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function MappingReviewHistoryDisplay({
  loadMoreContext,
  review,
}: {
  loadMoreContext?: {
    organisationSlug: string;
    reportId: string;
  };
  review: AppbMappingReview;
}) {
  const decisionVersions = review.history?.decisionVersions ?? [];
  const recentDecisionVersions = decisionVersions.slice(
    0,
    APPB_MAPPING_REVIEW_HISTORY_DEFAULT_EVENT_LIMIT,
  );
  const olderDecisionVersionCount =
    review.history?.olderDecisionVersionCount ?? 0;
  const rejectedCounts = review.history?.rejectedNoteReasonCounts ?? [];

  if (!review.history) {
    return (
      <p className="mt-2 text-xs leading-5 text-charcoal-600">
        No persisted report-specific history yet. This card is showing
        value-free template metadata only.
      </p>
    );
  }

  return (
    <details className="mt-3 rounded-md border border-earth-200 bg-white p-3">
      <summary className="cursor-pointer text-xs font-semibold text-charcoal-950">
        Safe review history
      </summary>
      <p className="mt-2 text-xs font-semibold uppercase text-ochre-700">
        Current decision
      </p>
      <dl className="mt-2 grid gap-2 text-xs text-charcoal-600 sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-charcoal-700">Decision</dt>
          <dd>{formatStatus(review.decision)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-charcoal-700">Status</dt>
          <dd>{formatStatus(review.status)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-charcoal-700">Target label</dt>
          <dd>{review.label}</dd>
        </div>
        <div>
          <dt className="font-semibold text-charcoal-700">Target kind / ID</dt>
          <dd>
            {formatStatus(review.targetKind)} / {review.targetId}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-charcoal-700">Template version</dt>
          <dd>{review.templateVersionId}</dd>
        </div>
        <div>
          <dt className="font-semibold text-charcoal-700">Reviewer</dt>
          <dd>{review.reviewer?.displayName ?? "Unknown reviewer"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-charcoal-700">Reviewed</dt>
          <dd>
            {review.reviewedAt
              ? formatReviewDate(review.reviewedAt)
              : "Not recorded"}
          </dd>
        </div>
      </dl>

      {review.note ? (
        <div className="mt-3 rounded-md bg-earth-50 p-2">
          <p className="text-xs font-semibold text-charcoal-700">
            Stored safe note
          </p>
          <p className="mt-1 text-xs leading-5 text-charcoal-600">
            {review.note.text}
          </p>
        </div>
      ) : null}

      <div className="mt-3 rounded-md bg-earth-50 p-2">
        <p className="text-xs font-semibold text-charcoal-700">
          Decision version events
        </p>
        {decisionVersions.length === 0 ? (
          <p className="mt-1 text-xs leading-5 text-charcoal-600">
            Current decision only. No previous value-free decision event is
            available for this target yet.
          </p>
        ) : (
          <>
            <p className="mt-1 text-xs leading-5 text-charcoal-600">
              Most recent value-free events first. Current decision metadata is
              shown above.
            </p>
            <MappingReviewDecisionVersionList
              versions={recentDecisionVersions}
            />
            {olderDecisionVersionCount > 0 && loadMoreContext ? (
              <AppbMappingReviewHistoryLoadMore
                initialRemainingCount={olderDecisionVersionCount}
                requestScope={{
                  appbReportId: loadMoreContext.reportId,
                  organisationSlug: loadMoreContext.organisationSlug,
                  targetId: review.targetId,
                  targetKind: review.targetKind,
                  templateVersionId: review.templateVersionId,
                }}
              />
            ) : olderDecisionVersionCount > 0 ? (
              <p className="mt-2 text-xs leading-5 text-charcoal-600">
                {olderDecisionVersionCount} older value-free decision events are
                available in the report-specific history view.
              </p>
            ) : null}
          </>
        )}
      </div>

      <div className="mt-3 rounded-md bg-earth-50 p-2">
        <p className="text-xs font-semibold text-charcoal-700">
          Rejected note attempts
        </p>
        {rejectedCounts.length === 0 ? (
          <p className="mt-1 text-xs leading-5 text-charcoal-600">
            No value-free rejected-note metadata recorded for this target.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {rejectedCounts.map((count) => (
              <span
                className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-charcoal-700"
                key={count.reasonCode}
              >
                {formatStatus(count.reasonCode)}: {count.count}
              </span>
            ))}
          </div>
        )}
      </div>

      <p className="mt-3 text-xs leading-5 text-charcoal-600">
        History shows metadata only. Rejected unsafe note text, workbook values
        and manual APP&B values are never displayed here.
      </p>
    </details>
  );
}

function MappingReviewDecisionForm({
  review,
  saveContext,
}: {
  review: AppbMappingReview;
  saveContext: {
    organisationSlug: string;
    reportId: string;
    templateVersionId: string;
  };
}) {
  return (
    <form
      action={saveAppbMappingReviewDecisionAction}
      className="mt-3 rounded-md border border-earth-200 bg-earth-50 p-3"
    >
      <input
        name="organisationSlug"
        type="hidden"
        value={saveContext.organisationSlug}
      />
      <input name="appbReportId" type="hidden" value={saveContext.reportId} />
      <input
        name="templateVersionId"
        type="hidden"
        value={saveContext.templateVersionId}
      />
      <input name="targetKind" type="hidden" value={review.targetKind} />
      <input name="targetId" type="hidden" value={review.targetId} />

      <label className="block text-sm font-semibold text-charcoal-700">
        Review decision
        <select
          className="mt-1 w-full rounded-md border border-earth-300 bg-white px-3 py-2 text-sm text-charcoal-950"
          defaultValue={review.decision}
          name="decision"
          required
        >
          <option value="keep-needs-review">Keep needs review</option>
          <option value="mark-reviewed">Mark reviewed</option>
          <option value="mark-blocked-formula">Mark blocked formula</option>
          <option value="mark-blocked-hidden-sheet">
            Mark blocked hidden sheet
          </option>
          <option value="mark-blocked-unsupported">
            Mark blocked unsupported
          </option>
          <option value="mark-unmapped">Mark unmapped</option>
          <option value="mark-ready-for-future-export">
            Mark ready for future export
          </option>
        </select>
      </label>

      <label className="mt-3 block text-sm font-semibold text-charcoal-700">
        Safe review note
        <textarea
          className="mt-1 min-h-16 w-full rounded-md border border-earth-300 bg-white px-3 py-2 text-sm text-charcoal-950"
          defaultValue={review.note?.text ?? ""}
          maxLength={240}
          name="safeNote"
          placeholder="Metadata only, e.g. range reviewed against template structure"
        />
      </label>

      <p className="mt-2 text-xs leading-5 text-charcoal-600">
        Use short metadata notes only. Do not enter workbook values, financial
        figures, personal details, report narrative, private links or copied
        worksheet text. Unsafe notes are rejected without storing the text.
      </p>

      <button
        className="mt-3 inline-flex rounded-md bg-charcoal-900 px-4 py-2 text-sm font-semibold text-sand-50"
        type="submit"
      >
        Save review decision
      </button>
    </form>
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
  const groups = groupManualFieldDefinitions(definitions);

  return (
    <div className="mt-3 rounded-md border border-earth-200 bg-white p-3">
      <AppbManualFieldSafeSummary
        definitionCount={definitions.length}
        enteredCount={enteredCount}
        statusCounts={statusCounts}
      />

      <details className="mt-3 rounded-md border border-earth-200 bg-earth-50 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-charcoal-950">
          Edit manual report fields
        </summary>
        <p className="mt-2 text-xs leading-5 text-charcoal-600">
          Editing context: existing values are loaded here so status-only
          changes can preserve them. Compact report cards stay value-free.
        </p>
        <AppbManualFieldEditor
          groups={groups}
          organisationSlug={organisationSlug}
          report={report}
        />
      </details>
    </div>
  );
}

function AppbManualFieldSafeSummary({
  definitionCount,
  enteredCount,
  statusCounts,
}: {
  definitionCount: number;
  enteredCount: number;
  statusCounts: Array<{ count: number; status: string }>;
}) {
  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-ochre-700">
            Manual report fields
          </p>
          <p className="mt-1 text-sm font-semibold text-charcoal-950">
            {enteredCount} of {definitionCount} entered or reviewed
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
            <AppbManualFieldStatusBadge
              count={count.count}
              key={count.status}
              status={count.status}
            />
          ))
        )}
      </div>
    </>
  );
}

function AppbManualFieldEditor({
  groups,
  organisationSlug,
  report,
}: {
  groups: ManualFieldDefinitionGroup[];
  organisationSlug: string;
  report: AppbReportOverview;
}) {
  const manualFieldById = new Map(
    report.manualFields.map((field) => [field.fieldId, field]),
  );

  return (
    <div className="mt-3 space-y-3">
      {groups.map((group) => (
        <AppbManualFieldGroupCard
          group={group}
          key={group.key}
          manualFieldById={manualFieldById}
          organisationSlug={organisationSlug}
          reportId={report.id}
        />
      ))}
    </div>
  );
}

function AppbManualFieldGroupCard({
  group,
  manualFieldById,
  organisationSlug,
  reportId,
}: {
  group: ManualFieldDefinitionGroup;
  manualFieldById: Map<string, AppbManualFieldOverview>;
  organisationSlug: string;
  reportId: string;
}) {
  return (
    <section className="rounded-md border border-earth-200 bg-white p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-charcoal-950">
            {group.label}
          </p>
          <p className="mt-1 text-xs leading-5 text-charcoal-600">
            {group.description}
          </p>
        </div>
        <span className="rounded-md bg-earth-50 px-2.5 py-1 text-xs font-semibold text-charcoal-700">
          {group.definitions.length} fields
        </span>
      </div>

      <div className="mt-3 space-y-3">
        {group.definitions.map((definition) => {
          const currentField = manualFieldById.get(definition.fieldId);

          return (
            <form
              action={upsertAppbManualFieldValueAction}
              className="rounded-md border border-earth-200 bg-earth-50 p-3"
              key={definition.fieldId}
            >
              <input name="organisationSlug" type="hidden" value={organisationSlug} />
              <input name="appbReportId" type="hidden" value={reportId} />
              <input name="fieldId" type="hidden" value={definition.fieldId} />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-charcoal-950">
                    {definition.fieldLabel}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-charcoal-600">
                    {helperTextForManualField(definition)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AppbManualFieldStatusBadge
                    status={currentField?.status ?? "Blank"}
                  />
                  <AppbManualFieldSensitivityBadge
                    sensitivity={definition.sensitivity}
                  />
                  <span className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-charcoal-700">
                    {formatStatus(definition.fieldType)}
                  </span>
                </div>
              </div>

              <AppbManualFieldSensitiveEditWarning
                sensitivity={definition.sensitivity}
              />

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <AppbManualFieldReviewState currentField={currentField} />
                <AppbManualFieldValueInput
                  currentField={currentField}
                  definition={definition}
                />
              </div>

              <AppbManualFieldClearModeControl />

              <label className="mt-3 block text-sm font-semibold text-charcoal-700">
                Safe note
                <textarea
                  className="mt-1 min-h-20 w-full rounded-md border border-earth-300 bg-white px-3 py-2 text-sm text-charcoal-950"
                  defaultValue={currentField?.notes ?? ""}
                  maxLength={300}
                  name="notes"
                  placeholder="Optional note; not shown in compact summaries"
                />
              </label>

              <button
                className="mt-3 inline-flex rounded-md bg-charcoal-900 px-4 py-2 text-sm font-semibold text-sand-50"
                type="submit"
              >
                Save field
              </button>
            </form>
          );
        })}
      </div>
    </section>
  );
}

function AppbManualFieldReviewState({
  currentField,
}: {
  currentField?: AppbManualFieldOverview;
}) {
  return (
    <label className="text-sm font-semibold text-charcoal-700">
      Status
      <select
        className="mt-1 w-full rounded-md border border-earth-300 bg-white px-3 py-2 text-sm text-charcoal-950"
        defaultValue={statusValueForSelect(currentField?.status)}
        name="status"
        required
      >
        <option value="BLANK">Blank</option>
        <option value="DRAFT">Draft</option>
        <option value="ENTERED">Entered</option>
        <option value="NEEDS_REVIEW">Needs review</option>
        <option value="REVIEWED">Reviewed</option>
        <option value="NOT_APPLICABLE">Not applicable</option>
      </select>
      <span className="mt-1 block text-xs leading-5 text-charcoal-600">
        Blank clears values and notes. Not applicable clears typed values and
        can keep a short safe note.
      </span>
    </label>
  );
}

function AppbManualFieldClearModeControl() {
  return (
    <label className="mt-3 block text-sm font-semibold text-charcoal-700">
      Clear action
      <select
        className="mt-1 w-full rounded-md border border-earth-300 bg-white px-3 py-2 text-sm text-charcoal-950"
        defaultValue="PRESERVE_EXISTING"
        name="clearMode"
      >
        <option value="PRESERVE_EXISTING">Preserve existing value</option>
        <option value="REPLACE_VALUE">Replace with submitted value</option>
        <option value="CLEAR_VALUE">Clear typed value only</option>
        <option value="CLEAR_NOTE">Clear note only</option>
        <option value="CLEAR_VALUE_AND_NOTE">Clear value and note</option>
        <option value="MARK_BLANK">Mark blank and clear all</option>
        <option value="MARK_NOT_APPLICABLE">
          Mark not applicable and clear value
        </option>
      </select>
      <span className="mt-1 block text-xs leading-5 text-charcoal-600">
        Destructive clear actions run only when selected here or when the status
        is saved as blank or not applicable. Audit records the action, not the
        raw value.
      </span>
    </label>
  );
}

function AppbManualFieldValueInput({
  currentField,
  definition,
}: {
  currentField?: AppbManualFieldOverview;
  definition: AppbManualFieldDefinition;
}) {
  if (definition.fieldType === "ROW_GROUP_PLACEHOLDER") {
    return (
      <div className="rounded-md border border-dashed border-earth-300 bg-white p-3">
        <p className="text-sm font-semibold text-charcoal-700">
          Status-only placeholder
        </p>
        <p className="mt-1 text-xs leading-5 text-charcoal-600">
          Use the status and safe note for this row group until detailed rows are
          scoped.
        </p>
      </div>
    );
  }

  if (definition.fieldType === "LONG_TEXT") {
    return (
      <label className="text-sm font-semibold text-charcoal-700">
        Long text
        <textarea
          className="mt-1 min-h-24 w-full rounded-md border border-earth-300 bg-white px-3 py-2 text-sm text-charcoal-950"
          defaultValue={currentField?.valueText ?? ""}
          maxLength={500}
          name="valueText"
          placeholder="Stored, not shown in compact summaries"
        />
      </label>
    );
  }

  if (definition.fieldType === "NUMBER" || definition.fieldType === "CURRENCY") {
    return (
      <label className="text-sm font-semibold text-charcoal-700">
        {definition.fieldType === "CURRENCY" ? "Currency value" : "Number"}
        <input
          className="mt-1 w-full rounded-md border border-earth-300 bg-white px-3 py-2 text-sm text-charcoal-950"
          defaultValue={currentField?.valueNumber ?? ""}
          name="valueNumber"
          placeholder="Stored, not shown in compact summaries"
          step={definition.fieldType === "CURRENCY" ? "0.01" : "1"}
          type="number"
        />
      </label>
    );
  }

  if (definition.fieldType === "DATE") {
    return (
      <label className="text-sm font-semibold text-charcoal-700">
        Date
        <input
          className="mt-1 w-full rounded-md border border-earth-300 bg-white px-3 py-2 text-sm text-charcoal-950"
          defaultValue={currentField?.valueDate ?? ""}
          name="valueDate"
          type="date"
        />
      </label>
    );
  }

  if (definition.fieldType === "YES_NO") {
    return (
      <label className="text-sm font-semibold text-charcoal-700">
        Yes/no
        <select
          className="mt-1 w-full rounded-md border border-earth-300 bg-white px-3 py-2 text-sm text-charcoal-950"
          defaultValue={yesNoValueForSelect(currentField?.valueText)}
          name="valueText"
        >
          <option value="">Select</option>
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </label>
    );
  }

  return (
    <label className="text-sm font-semibold text-charcoal-700">
      {definition.fieldType === "SELECT" ? "Select value" : "Short text"}
      <input
        className="mt-1 w-full rounded-md border border-earth-300 bg-white px-3 py-2 text-sm text-charcoal-950"
        defaultValue={currentField?.valueText ?? ""}
        maxLength={500}
        name="valueText"
        placeholder="Stored, not shown in compact summaries"
      />
    </label>
  );
}

function AppbManualFieldSensitiveEditWarning({
  sensitivity,
}: {
  sensitivity: string;
}) {
  const message = sensitiveEditWarning(sensitivity);

  if (!message) {
    return null;
  }

  return (
    <p className="mt-3 rounded-md border border-ochre-200 bg-white px-3 py-2 text-xs leading-5 text-charcoal-700">
      {message}
    </p>
  );
}

function AppbManualFieldStatusBadge({
  count,
  status,
}: {
  count?: number;
  status: string;
}) {
  return (
    <span className="rounded-md bg-earth-50 px-2.5 py-1 text-xs font-semibold text-charcoal-700">
      {formatStatus(status)}
      {typeof count === "number" ? `: ${count}` : ""}
    </span>
  );
}

function AppbManualFieldSensitivityBadge({
  sensitivity,
}: {
  sensitivity: string;
}) {
  return (
    <span className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-ochre-700">
      {formatStatus(sensitivity)}
    </span>
  );
}

type ManualFieldDefinitionGroup = {
  definitions: AppbManualFieldDefinition[];
  description: string;
  key: string;
  label: string;
};

function groupManualFieldDefinitions(
  definitions: AppbManualFieldDefinition[],
): ManualFieldDefinitionGroup[] {
  const groups = new Map<string, AppbManualFieldDefinition[]>();

  for (const definition of definitions) {
    const group = groups.get(definition.fieldGroup) ?? [];
    group.push(definition);
    groups.set(definition.fieldGroup, group);
  }

  return [...groups.entries()].map(([key, groupedDefinitions]) => ({
    definitions: groupedDefinitions,
    description: manualFieldGroupDescription(key),
    key,
    label: manualFieldGroupLabel(key),
  }));
}

function manualFieldGroupLabel(group: string) {
  switch (group) {
    case "report-setup":
      return "Report setup";
    case "manual-finance":
      return "Manual finance";
    case "manual-wage-personnel":
      return "Manual wage/personnel";
    case "manual-narrative":
      return "Manual narrative";
    case "fee-for-service-rows":
      return "Fee-for-service rows";
    case "asset-register-rows":
      return "Asset register rows";
    default:
      return "Other report-only fields";
  }
}

function manualFieldGroupDescription(group: string) {
  switch (group) {
    case "manual-finance":
      return "Report-only finance or acquittal values. These are not accounting source records.";
    case "manual-wage-personnel":
      return "Report-only workforce summaries. These are not personnel system-of-record fields.";
    case "manual-narrative":
      return "Free-text report narrative, edited only in this context and hidden from compact cards.";
    case "fee-for-service-rows":
      return "Placeholder status controls for future fee-for-service row capture.";
    case "asset-register-rows":
      return "Placeholder status controls for future asset register row capture.";
    case "report-setup":
      return "Report-only setup values used to support readiness checks.";
    default:
      return "Manual values that ROPES does not yet own as structured operational data.";
  }
}

function helperTextForManualField(definition: AppbManualFieldDefinition) {
  if (definition.fieldType === "ROW_GROUP_PLACEHOLDER") {
    return "Mark the row group status now; detailed row entry remains future work.";
  }

  if (definition.sensitivity === "FINANCE") {
    return "Use for report-only finance context, not accounting calculations.";
  }

  if (definition.sensitivity === "PERSONNEL") {
    return "Use for report-only workforce context, not personnel records.";
  }

  if (definition.sensitivity === "NARRATIVE") {
    return "Narrative text is hidden from compact summaries.";
  }

  return "Stored value supports readiness only; export remains blocked.";
}

function sensitiveEditWarning(sensitivity: string) {
  switch (sensitivity) {
    case "FINANCE":
      return "Finance values are report-only and are not accounting source records.";
    case "PERSONNEL":
      return "Personnel values are report-only and are not wage or personnel system-of-record data.";
    case "NARRATIVE":
      return "Narrative values are only shown in this editing context and remain hidden from compact summaries.";
    case "SENSITIVE":
      return "Sensitive report-only values stay out of compact cards, URLs and audit metadata.";
    default:
      return null;
  }
}

function statusValueForSelect(status: string | undefined) {
  return status?.toUpperCase().replace(/\s+/g, "_") ?? "BLANK";
}

function yesNoValueForSelect(value: string | undefined) {
  const normalised = value?.toLowerCase();
  return normalised === "yes" || normalised === "no" ? normalised : "";
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

function formatReviewDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Review date unavailable";
  }

  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
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
