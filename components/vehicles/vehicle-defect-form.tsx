import Link from "next/link";
import type {
  DemoVehicle,
  DemoVehicleDefect,
  DemoVehiclePreStartChecklist,
  VehicleDefectStatusValue,
} from "@/lib/vehicles-data";
import {
  vehicleDefectCategoryOptions,
  vehicleDefectSeverityOptions,
  vehicleDefectStatusOptions,
} from "@/lib/vehicles-data";

type VehicleDefectFormProps = {
  action?: (formData: FormData) => void | Promise<void>;
  defects: DemoVehicleDefect[];
  linkedPreStart?: DemoVehiclePreStartChecklist | null;
  organisationId?: string;
  organisationName: string;
  organisationSlug: string;
  persistenceEnabled: boolean;
  statusAction?: (formData: FormData) => void | Promise<void>;
  vehicle: DemoVehicle;
};

export function VehicleDefectForm({
  action,
  defects,
  linkedPreStart,
  organisationId,
  organisationName,
  organisationSlug,
  persistenceEnabled,
  statusAction,
  vehicle,
}: VehicleDefectFormProps) {
  const openDefects = defects.filter(
    (defect) => defect.statusValue !== "RESOLVED",
  );
  const resolvedDefects = defects.filter(
    (defect) => defect.statusValue === "RESOLVED",
  );
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
      <form
        action={action}
        className="space-y-5 rounded-md border border-earth-200 bg-white p-5 shadow-sm"
      >
        <input name="organisationSlug" type="hidden" value={organisationSlug} />
        <input
          name="organisationId"
          type="hidden"
          value={organisationId ?? ""}
        />
        <input name="vehicleId" type="hidden" value={vehicle.id} />
        <input
          name="preStartChecklistId"
          type="hidden"
          value={linkedPreStart?.id ?? ""}
        />

        <div className="rounded-md border border-earth-200 bg-earth-50 p-4">
          <p className="text-sm font-semibold text-charcoal-950">
            {vehicle.name} / {organisationName}
          </p>
          <p className="text-sm leading-6 text-charcoal-600">
            {persistenceEnabled
              ? "Submitting records a tenant-guarded defect only; bookings and maintenance workflows are unchanged."
              : "No local database is available, so the form keeps demo-only behaviour."}
          </p>
          {linkedPreStart ? (
            <p className="mt-2 text-sm font-semibold text-ochre-800">
              Linked to latest pre-start from{" "}
              {formatDateTime(linkedPreStart.checkedAt)}.
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <SelectControl
            label="Category"
            name="category"
            options={vehicleDefectCategoryOptions}
          />
          <SelectControl
            label="Severity"
            name="severity"
            options={vehicleDefectSeverityOptions}
          />
          <SelectControl
            label="Status"
            name="status"
            options={vehicleDefectStatusOptions}
          />
          <label className="block">
            <span className="text-sm font-semibold text-charcoal-800">
              Reported date
            </span>
            <input
              className="mt-2 w-full rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600"
              defaultValue={today}
              max={today}
              name="reportedAt"
              required
              type="date"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-charcoal-800">
            Description
          </span>
          <textarea
            className="mt-2 min-h-32 w-full rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600"
            maxLength={300}
            name="description"
            placeholder="Short operational note only. Do not enter private personal information."
            required
          />
          <span className="mt-1 block text-xs font-medium text-charcoal-500">
            300 characters maximum
          </span>
        </label>

        <button
          className="rounded-md bg-ochre-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
          type="submit"
        >
          {persistenceEnabled ? "Submit defect" : "Submit demo defect"}
        </button>
      </form>

      <section className="rounded-md border border-earth-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1 border-b border-earth-100 pb-4">
          <p className="text-sm font-semibold text-charcoal-600">
            Open defects
          </p>
          <p className="text-3xl font-semibold text-charcoal-950">
            {openDefects.length}
          </p>
        </div>

        {defects.length ? (
          <div className="space-y-5 pt-4">
            <DefectList
              action={statusAction}
              defects={openDefects}
              emptyMessage="No open defects need review."
              organisationId={organisationId}
              organisationSlug={organisationSlug}
              persistenceEnabled={persistenceEnabled}
              title="Open and monitoring"
              vehicle={vehicle}
            />
            <DefectList
              action={statusAction}
              defects={resolvedDefects.slice(0, 5)}
              emptyMessage="No resolved defects are recorded yet."
              organisationId={organisationId}
              organisationSlug={organisationSlug}
              persistenceEnabled={persistenceEnabled}
              title="Resolved"
              vehicle={vehicle}
            />
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-charcoal-600">
            No defect reports are recorded for this vehicle in the selected
            organisation.
          </p>
        )}
      </section>
    </div>
  );
}

function DefectList({
  action,
  defects,
  emptyMessage,
  organisationId,
  organisationSlug,
  persistenceEnabled,
  title,
  vehicle,
}: {
  action?: (formData: FormData) => void | Promise<void>;
  defects: DemoVehicleDefect[];
  emptyMessage: string;
  organisationId?: string;
  organisationSlug: string;
  persistenceEnabled: boolean;
  title: string;
  vehicle: DemoVehicle;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase text-charcoal-600">
        {title}
      </h3>
      {defects.length ? (
        <div className="mt-2 divide-y divide-earth-100">
          {defects.map((defect) => (
            <DefectReviewCard
              action={action}
              defect={defect}
              key={defect.id}
              organisationId={organisationId}
              organisationSlug={organisationSlug}
              persistenceEnabled={persistenceEnabled}
              vehicle={vehicle}
            />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm leading-6 text-charcoal-600">
          {emptyMessage}
        </p>
      )}
    </div>
  );
}

function DefectReviewCard({
  action,
  defect,
  organisationId,
  organisationSlug,
  persistenceEnabled,
  vehicle,
}: {
  action?: (formData: FormData) => void | Promise<void>;
  defect: DemoVehicleDefect;
  organisationId?: string;
  organisationSlug: string;
  persistenceEnabled: boolean;
  vehicle: DemoVehicle;
}) {
  const transitionOptions = getStatusTransitionOptions(defect.statusValue);

  return (
    <article className="py-4">
      <div className="flex flex-wrap gap-2">
        <Badge>{defect.status}</Badge>
        <Badge>{defect.severity}</Badge>
        <Badge>{defect.category}</Badge>
      </div>
      <p className="mt-2 text-sm text-charcoal-600">
        Reported {formatDateTime(defect.reportedAt)} by {defect.reportedBy}
      </p>
      {defect.preStartChecklistId ? (
        <p className="mt-1 text-xs font-semibold text-ochre-800">
          Pre-start linked
        </p>
      ) : null}

      {transitionOptions.length ? (
        <div className="mt-4 space-y-3">
          <form action={action} className="space-y-3">
            <input
              name="organisationSlug"
              type="hidden"
              value={organisationSlug}
            />
            <input
              name="organisationId"
              type="hidden"
              value={organisationId ?? ""}
            />
            <input name="vehicleId" type="hidden" value={vehicle.id} />
            <input name="defectId" type="hidden" value={defect.id} />

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="block">
                <span className="text-xs font-semibold uppercase text-charcoal-600">
                  New status
                </span>
                <select
                  className="mt-2 w-full rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600"
                  name="status"
                  required
                >
                  {transitionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="h-fit self-end rounded-md bg-charcoal-900 px-3 py-2 text-sm font-semibold text-white"
                type="submit"
              >
                {persistenceEnabled ? "Update status" : "Update demo status"}
              </button>
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase text-charcoal-600">
                Safe note
              </span>
              <textarea
                className="mt-2 min-h-20 w-full rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600"
                maxLength={240}
                name="statusNote"
                placeholder="Optional short resolution or monitoring note."
              />
              <span className="mt-1 block text-xs font-medium text-charcoal-500">
                240 characters maximum
              </span>
            </label>
          </form>
          <Link
            className="inline-flex w-fit rounded-md border border-earth-300 bg-earth-50 px-3 py-2 text-sm font-semibold text-charcoal-800"
            href={`/vehicles/${vehicle.id}/maintenance?org=${organisationSlug}&defect=${defect.id}`}
          >
            Record maintenance
          </Link>
        </div>
      ) : null}
    </article>
  );
}

function SelectControl({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-charcoal-800">{label}</span>
      <select
        className="mt-2 w-full rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600"
        name={name}
        required
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-earth-100 px-2.5 py-1 text-xs font-semibold text-charcoal-700">
      {children}
    </span>
  );
}

function getStatusTransitionOptions(status: VehicleDefectStatusValue) {
  const transitions: Record<
    VehicleDefectStatusValue,
    VehicleDefectStatusValue[]
  > = {
    MONITORING: ["OPEN", "RESOLVED"],
    OPEN: ["MONITORING", "RESOLVED"],
    RESOLVED: ["MONITORING", "OPEN"],
  };

  return transitions[status].map((value) => {
    const option = vehicleDefectStatusOptions.find(
      (statusOption) => statusOption.value === value,
    );

    return {
      label: option?.label ?? value,
      value,
    };
  });
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
