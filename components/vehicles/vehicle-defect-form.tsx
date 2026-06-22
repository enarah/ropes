import type {
  DemoVehicle,
  DemoVehicleDefect,
  DemoVehiclePreStartChecklist,
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
  vehicle,
}: VehicleDefectFormProps) {
  const openDefects = defects.filter(
    (defect) => defect.statusValue !== "RESOLVED",
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
          <div className="divide-y divide-earth-100">
            {defects.slice(0, 5).map((defect) => (
              <div className="py-4" key={defect.id}>
                <div className="flex flex-wrap gap-2">
                  <Badge>{defect.status}</Badge>
                  <Badge>{defect.severity}</Badge>
                  <Badge>{defect.category}</Badge>
                </div>
                <p className="mt-2 text-sm text-charcoal-600">
                  {formatDateTime(defect.reportedAt)}
                </p>
                {defect.preStartChecklistId ? (
                  <p className="mt-1 text-xs font-semibold text-ochre-800">
                    Pre-start linked
                  </p>
                ) : null}
              </div>
            ))}
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
