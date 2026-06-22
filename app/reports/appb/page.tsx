import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";
import { DisabledFeatureState } from "@/components/disabled-feature-state";
import { UnauthorisedState } from "@/components/unauthorised-state";
import { organisationHasCapability } from "@/lib/capability-registry";
import { getOrganisationPageAccess } from "@/lib/organisation-access";
import {
  appbFutureConcepts,
  appbRopesDataSources,
  appbSourceTemplates,
  appbTemplateProfiles,
} from "@/lib/appb-reporting";

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

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Template profiles" value={String(appbTemplateProfiles.length)} />
        <SummaryCard label="Source examples" value={String(appbSourceTemplates.length)} />
        <SummaryCard label="Future concepts" value={String(appbFutureConcepts.length)} />
      </section>

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
