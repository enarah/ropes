import type {
  DemoVehicle,
  DemoVehicleDefect,
  DemoVehicleMaintenanceRecord,
} from "@/lib/vehicles-data";
import {
  vehicleMaintenanceStatusOptions,
  vehicleMaintenanceTypeOptions,
} from "@/lib/vehicles-data";

type VehicleMaintenanceFormProps = {
  action?: (formData: FormData) => void | Promise<void>;
  defects: DemoVehicleDefect[];
  linkedDefectId?: string;
  maintenanceRecords: DemoVehicleMaintenanceRecord[];
  organisationId?: string;
  organisationName: string;
  organisationSlug: string;
  persistenceEnabled: boolean;
  vehicle: DemoVehicle;
};

export function VehicleMaintenanceForm({
  action,
  defects,
  linkedDefectId,
  maintenanceRecords,
  organisationId,
  organisationName,
  organisationSlug,
  persistenceEnabled,
  vehicle,
}: VehicleMaintenanceFormProps) {
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

        <div className="rounded-md border border-earth-200 bg-earth-50 p-4">
          <p className="text-sm font-semibold text-charcoal-950">
            {vehicle.name} / {organisationName}
          </p>
          <p className="text-sm leading-6 text-charcoal-600">
            {persistenceEnabled
              ? "Submitting records maintenance history only; it does not create work orders, scheduling or booking blocks."
              : "No local database is available, so the form keeps demo-only behaviour."}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <SelectControl
            label="Type"
            name="type"
            options={vehicleMaintenanceTypeOptions}
          />
          <SelectControl
            label="Status"
            name="status"
            options={vehicleMaintenanceStatusOptions}
          />
          <label className="block">
            <span className="text-sm font-semibold text-charcoal-800">
              Maintenance date
            </span>
            <input
              className="mt-2 w-full rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600"
              defaultValue={today}
              name="maintenanceDate"
              required
              type="date"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-charcoal-800">
              Next due date
            </span>
            <input
              className="mt-2 w-full rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600"
              name="nextDueDate"
              type="date"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-charcoal-800">
              Provider
            </span>
            <input
              className="mt-2 w-full rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600"
              maxLength={120}
              name="provider"
              placeholder="Workshop, depot or provider"
              type="text"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-charcoal-800">
              Odometer kilometres
            </span>
            <input
              className="mt-2 w-full rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600"
              defaultValue={vehicle.odometerKm}
              max={2_000_000}
              min={0}
              name="odometerKm"
              type="number"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-charcoal-800">
              Cost
            </span>
            <input
              className="mt-2 w-full rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600"
              min={0}
              name="cost"
              placeholder="0.00"
              step="0.01"
              type="number"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-charcoal-800">
              Linked defect
            </span>
            <select
              className="mt-2 w-full rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600"
              defaultValue={linkedDefectId ?? ""}
              name="defectId"
            >
              <option value="">No linked defect</option>
              {defects.map((defect) => (
                <option key={defect.id} value={defect.id}>
                  {defect.status} / {defect.severity} / {defect.category}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-charcoal-800">
            Short notes
          </span>
          <textarea
            className="mt-2 min-h-28 w-full rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600"
            maxLength={300}
            name="notes"
            placeholder="Short operational note only. Do not enter private personal information."
          />
          <span className="mt-1 block text-xs font-medium text-charcoal-500">
            300 characters maximum
          </span>
        </label>

        <button
          className="rounded-md bg-ochre-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
          type="submit"
        >
          {persistenceEnabled
            ? "Save maintenance record"
            : "Save demo maintenance"}
        </button>
      </form>

      <section className="rounded-md border border-earth-200 bg-white p-5 shadow-sm">
        <div className="border-b border-earth-100 pb-4">
          <p className="text-sm font-semibold text-charcoal-600">
            Recent maintenance
          </p>
          <p className="mt-1 text-3xl font-semibold text-charcoal-950">
            {maintenanceRecords.length}
          </p>
        </div>
        {maintenanceRecords.length ? (
          <div className="divide-y divide-earth-100">
            {maintenanceRecords.slice(0, 6).map((record) => (
              <article className="py-4" key={record.id}>
                <div className="flex flex-wrap gap-2">
                  <Badge>{record.status}</Badge>
                  <Badge>{record.type}</Badge>
                  {record.defectId ? <Badge>Defect linked</Badge> : null}
                </div>
                <p className="mt-2 text-sm text-charcoal-600">
                  {formatDate(record.maintenanceDate)}
                  {record.provider ? ` / ${record.provider}` : ""}
                </p>
                <p className="mt-1 text-xs font-semibold text-charcoal-600">
                  {record.odometerKm
                    ? `${record.odometerKm.toLocaleString("en-AU")} km`
                    : "Odometer not recorded"}
                  {record.nextDueDate
                    ? ` / next due ${formatDate(record.nextDueDate)}`
                    : ""}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-charcoal-600">
            No maintenance records are visible for this vehicle in the selected
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
  }).format(new Date(value));
}
