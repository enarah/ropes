import Link from "next/link";
import { AlertTriangle, ClipboardCheck, Radio, ShieldCheck } from "lucide-react";
import { saveTripRiskAssessmentAction } from "@/app/trips/[tripId]/risk-assessment/actions";
import type { DemoTrip } from "@/lib/trips-data";
import { organisationHref } from "@/lib/trips-data";
import {
  activityRiskDefinitions,
  checkInEscalationGuidance,
  calculateTripRiskLevels,
  formatRiskLevel,
  getActivityRiskDefinitions,
  getTripTypeDefinition,
  tripTypeDefinitions,
  type TripRiskAssessmentDetails,
} from "@/lib/trip-risk-assessment";

type TripRiskAssessmentFormProps = {
  error?: string;
  organisationId?: string;
  organisationName: string;
  organisationSlug: string;
  persistenceEnabled: boolean;
  saved?: string;
  trip: DemoTrip;
};

export function TripRiskAssessmentForm({
  error,
  organisationId,
  organisationName,
  organisationSlug,
  persistenceEnabled,
  saved,
  trip,
}: TripRiskAssessmentFormProps) {
  const assessment = trip.riskAssessment;
  const tripTypeCode = assessment?.tripTypeCode ?? "1A";
  const activityRiskCodes = assessment?.activityRiskCodes ?? [];
  const tripType = getTripTypeDefinition(tripTypeCode) ?? tripTypeDefinitions[0];
  const activityRisks = getActivityRiskDefinitions(activityRiskCodes);
  const riskLevels = assessment
    ? {
        baseRiskLevel: assessment.baseRiskLevel,
        finalRiskLevel: assessment.finalRiskLevel,
      }
    : calculateTripRiskLevels(tripTypeCode, activityRiskCodes);
  const itineraryRows = getItineraryRows(trip, assessment);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-earth-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-ochre-700">
            Trips / {organisationName}
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-charcoal-950">
            TMP/JMP risk assessment
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-charcoal-700">
            {trip.title} / {trip.destination}
          </p>
        </div>
        <Link
          className="inline-flex items-center gap-2 rounded-md border border-earth-300 bg-white px-4 py-2 text-sm font-semibold text-charcoal-800"
          href={organisationHref(`/trips/${trip.id}`, organisationSlug)}
        >
          <ClipboardCheck aria-hidden="true" size={16} />
          Trip detail
        </Link>
      </section>

      {saved || error ? <StatusMessage error={error} saved={saved} /> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Trip type" value={tripType.code} />
        <SummaryCard
          label="Base risk"
          value={formatRiskLevel(riskLevels.baseRiskLevel)}
        />
        <SummaryCard
          label="Final risk"
          value={formatRiskLevel(riskLevels.finalRiskLevel)}
        />
      </section>

      <section className="rounded-md border border-earth-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-charcoal-950">
          <ShieldCheck aria-hidden="true" size={18} />
          <h2 className="text-xl font-semibold">Standard controls</h2>
        </div>
        <RiskDefinitionSummary definitions={[tripType, ...activityRisks]} />
      </section>

      <form
        action={persistenceEnabled ? saveTripRiskAssessmentAction : undefined}
        className="space-y-6"
      >
        <input name="organisationSlug" type="hidden" value={organisationSlug} />
        <input name="organisationId" type="hidden" value={organisationId ?? ""} />
        <input name="tripId" type="hidden" value={trip.id} />

        <section className="rounded-md border border-earth-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-charcoal-950">
            <AlertTriangle aria-hidden="true" size={18} />
            <h2 className="text-xl font-semibold">Risk classification</h2>
          </div>
          <div className="grid gap-3">
            {tripTypeDefinitions.map((definition) => (
              <label
                className="rounded-md border border-earth-200 bg-earth-50 p-4"
                key={definition.code}
              >
                <span className="flex items-start gap-3">
                  <input
                    className="mt-1"
                    defaultChecked={definition.code === tripTypeCode}
                    name="tripTypeCode"
                    required
                    type="radio"
                    value={definition.code}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-charcoal-950">
                      {definition.label}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-charcoal-600">
                      {definition.description}
                    </span>
                    <span className="mt-2 block text-xs font-semibold uppercase text-ochre-700">
                      {formatRiskLevel(definition.riskLevel)} risk
                    </span>
                  </span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-earth-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-charcoal-950">
            Activity-specific risk overlays
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {activityRiskDefinitions.map((definition) => (
              <label
                className="rounded-md border border-earth-200 bg-earth-50 p-4"
                key={definition.code}
              >
                <span className="flex items-start gap-3">
                  <input
                    className="mt-1"
                    defaultChecked={activityRiskCodes.some(
                      (code) => code === definition.code,
                    )}
                    name="activityRiskCodes"
                    type="checkbox"
                    value={definition.code}
                  />
                  <span>
                    <span className="block text-sm font-semibold text-charcoal-950">
                      {definition.label}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-charcoal-600">
                      {definition.description}
                    </span>
                  </span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <FieldGroup title="Journey management">
            <TextField
              defaultValue={assessment?.leadDrivers}
              label="Lead drivers"
              maxLength={240}
              name="leadDrivers"
            />
            <TextField
              defaultValue={assessment?.spotGarminDetails}
              label="SPOT/GARMIN"
              maxLength={240}
              name="spotGarminDetails"
            />
            <TextField
              defaultValue={assessment?.satellitePhone}
              label="Satellite phone"
              maxLength={240}
              name="satellitePhone"
            />
            <TextField
              defaultValue={assessment?.mobilePhone}
              label="Mobile phone"
              maxLength={240}
              name="mobilePhone"
            />
          </FieldGroup>

          <FieldGroup title="Equipment">
            <TextField
              defaultValue={assessment?.epirbDetails}
              label="EPIRB"
              maxLength={240}
              name="epirbDetails"
            />
            <TextField
              defaultValue={assessment?.firstAidDetails}
              label="First aid"
              maxLength={240}
              name="firstAidDetails"
            />
            <TextField
              defaultValue={assessment?.defibDetails}
              label="Defib"
              maxLength={240}
              name="defibDetails"
            />
            <TextField
              defaultValue={assessment?.dpfDetails}
              label="DPF"
              maxLength={240}
              name="dpfDetails"
            />
            <TextAreaField
              defaultValue={assessment?.otherEquipment}
              label="Other equipment"
              maxLength={300}
              name="otherEquipment"
            />
          </FieldGroup>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <FieldGroup title="Travellers">
            <TextAreaField
              defaultValue={assessment?.rangers}
              label="Rangers"
              maxLength={300}
              name="rangers"
            />
            <TextAreaField
              defaultValue={assessment?.partners}
              label="Partners"
              maxLength={300}
              name="partners"
            />
            <TextAreaField
              defaultValue={assessment?.medicalAllergyNotes}
              label="Medical/allergy notes"
              maxLength={500}
              name="medicalAllergyNotes"
            />
            <TextAreaField
              defaultValue={assessment?.relevantContacts}
              label="Relevant contacts"
              maxLength={500}
              name="relevantContacts"
            />
          </FieldGroup>

          <FieldGroup title="Trip-specific controls">
            <TextAreaField
              defaultValue={assessment?.tripSpecificControls}
              label="Controls and notes"
              maxLength={700}
              name="tripSpecificControls"
            />
            <label className="flex items-start gap-3 rounded-md border border-earth-200 bg-earth-50 p-4">
              <input
                className="mt-1"
                defaultChecked={assessment?.readyForManagerReview ?? false}
                name="readyForManagerReview"
                type="checkbox"
                value="ready"
              />
              <span>
                <span className="block text-sm font-semibold text-charcoal-950">
                  Ready for manager review
                </span>
                <span className="mt-1 block text-sm leading-6 text-charcoal-600">
                  Mark when the structured TMP/JMP fields have been checked.
                </span>
              </span>
            </label>
          </FieldGroup>
        </section>

        <section className="rounded-md border border-earth-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-charcoal-950">
            Daily itinerary and check-ins
          </h2>
          <input
            name="dailyItineraryRowCount"
            type="hidden"
            value={itineraryRows.length}
          />
          <div className="mt-4 grid gap-3">
            {itineraryRows.map((row, index) => (
              <article
                className="rounded-md border border-earth-200 bg-earth-50 p-4"
                key={`${row.day}-${index}`}
              >
                <input
                  name={`dailyDay-${index}`}
                  type="hidden"
                  value={row.day}
                />
                <div className="grid gap-3 md:grid-cols-[1fr_11rem]">
                  <div>
                    <p className="text-sm font-semibold text-charcoal-950">
                      {row.day}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-charcoal-600">
                      {row.title}
                    </p>
                  </div>
                  <label className="block">
                    <span className="text-sm font-semibold text-charcoal-800">
                      Date
                    </span>
                    <input
                      className="mt-2 w-full rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600"
                      defaultValue={row.date}
                      name={`dailyDate-${index}`}
                      type="date"
                    />
                  </label>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <TextAreaField
                    defaultValue={row.amSchedule}
                    label="AM schedule"
                    maxLength={240}
                    name={`dailyAmSchedule-${index}`}
                  />
                  <TextAreaField
                    defaultValue={row.pmSchedule}
                    label="PM schedule"
                    maxLength={240}
                    name={`dailyPmSchedule-${index}`}
                  />
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-charcoal-800">
                  <input
                    defaultChecked={row.checkInRequired}
                    name={`dailyCheckInRequired-${index}`}
                    type="checkbox"
                    value="yes"
                  />
                  Check-in required
                </label>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <FieldGroup title="Emergency contacts">
            <TextAreaField
              defaultValue={assessment?.emergencyContacts}
              label="Emergency contacts"
              maxLength={500}
              name="emergencyContacts"
            />
            <TextAreaField
              defaultValue={assessment?.escalationNotes}
              label="Escalation notes"
              maxLength={500}
              name="escalationNotes"
            />
          </FieldGroup>

          <section className="rounded-md border border-earth-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-charcoal-950">
              <Radio aria-hidden="true" size={18} />
              <h2 className="text-xl font-semibold">
                Check-in escalation guidance
              </h2>
            </div>
            <ol className="space-y-2 text-sm leading-6 text-charcoal-700">
              {checkInEscalationGuidance.map((item, index) => (
                <li className="flex gap-2" key={item}>
                  <span className="font-semibold text-ochre-700">
                    {index + 1}.
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </section>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-md bg-ochre-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-earth-300"
            disabled={!persistenceEnabled}
            type="submit"
          >
            Save TMP/JMP
          </button>
          {!persistenceEnabled ? (
            <p className="text-sm leading-6 text-charcoal-600">
              A configured database and selected organisation access are
              required to save this plan.
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}

function RiskDefinitionSummary({
  definitions,
}: {
  definitions: ReturnType<typeof getActivityRiskDefinitions>;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {definitions.map((definition) => (
        <article
          className="rounded-md border border-earth-200 bg-earth-50 p-4"
          key={definition.code}
        >
          <p className="text-sm font-semibold text-charcoal-950">
            {definition.label}
          </p>
          <p className="mt-2 text-xs font-semibold uppercase text-ochre-700">
            {formatRiskLevel(definition.riskLevel)} risk
          </p>
          <List label="Associated risks" values={definition.associatedRisks} />
          <List
            label="Standard mitigations"
            values={definition.standardMitigations}
          />
          <List
            label="References"
            values={definition.referenceDocuments}
          />
        </article>
      ))}
    </div>
  );
}

function List({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase text-charcoal-500">
        {label}
      </p>
      <ul className="mt-1 list-disc space-y-1 pl-4 text-sm leading-6 text-charcoal-700">
        {values.map((value) => (
          <li key={value}>{value}</li>
        ))}
      </ul>
    </div>
  );
}

function FieldGroup({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="space-y-4 rounded-md border border-earth-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-charcoal-950">{title}</h2>
      {children}
    </section>
  );
}

function TextField({
  defaultValue,
  label,
  maxLength,
  name,
}: {
  defaultValue?: string | null;
  label: string;
  maxLength: number;
  name: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-charcoal-800">{label}</span>
      <input
        className="mt-2 w-full rounded-md border border-earth-200 bg-earth-50 px-3 py-2 text-sm outline-none focus:border-ochre-600"
        defaultValue={defaultValue ?? ""}
        maxLength={maxLength}
        name={name}
      />
    </label>
  );
}

function TextAreaField({
  defaultValue,
  label,
  maxLength,
  name,
}: {
  defaultValue?: string | null;
  label: string;
  maxLength: number;
  name: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-charcoal-800">{label}</span>
      <textarea
        className="mt-2 min-h-24 w-full rounded-md border border-earth-200 bg-earth-50 px-3 py-2 text-sm outline-none focus:border-ochre-600"
        defaultValue={defaultValue ?? ""}
        maxLength={maxLength}
        name={name}
      />
      <span className="mt-1 block text-xs text-charcoal-500">
        Maximum {maxLength} characters.
      </span>
    </label>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-md border border-earth-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-charcoal-600">{label}</p>
      <p className="mt-2 text-xl font-semibold text-charcoal-950">{value}</p>
    </article>
  );
}

function StatusMessage({ error, saved }: { error?: string; saved?: string }) {
  const messages: Record<string, { body: string; title: string }> = {
    demo: {
      body: "No local database is configured, so the TMP/JMP plan was not persisted.",
      title: "Demo fallback",
    },
    persistence: {
      body: "The plan was not saved. Check the trip record and try again.",
      title: "Plan was not saved",
    },
    tenant: {
      body: "The tenant guard rejected this write for the selected organisation.",
      title: "Organisation access required",
    },
    validation: {
      body: "One of the selected risk values or short notes did not pass validation.",
      title: "Plan needs a quick check",
    },
    assessment: {
      body: "The TMP/JMP risk assessment was saved and recorded in the audit log.",
      title: "Plan saved",
    },
    capability: {
      body: "This organisation can access ROPES, but TMP/JMP risk assessment is not enabled for it.",
      title: "Capability disabled",
    },
  };
  const message = saved
    ? messages[saved] ?? messages.assessment
    : messages[error ?? "persistence"] ?? messages.persistence;

  return (
    <div className="rounded-md border border-earth-200 bg-earth-50 p-4">
      <p className="text-sm font-semibold text-charcoal-950">
        {message.title}
      </p>
      <p className="mt-1 text-sm leading-6 text-charcoal-600">
        {message.body}
      </p>
    </div>
  );
}

function getItineraryRows(
  trip: DemoTrip,
  assessment?: TripRiskAssessmentDetails | null,
) {
  const savedRows = assessment?.dailyItinerary ?? [];

  return trip.itinerary.map((item, index) => {
    const savedRow = savedRows[index];

    return {
      amSchedule: savedRow?.amSchedule ?? item.description,
      checkInRequired: savedRow?.checkInRequired ?? false,
      date: savedRow?.date ?? "",
      day: savedRow?.day ?? item.day,
      pmSchedule: savedRow?.pmSchedule ?? "",
      title: item.title,
    };
  });
}
