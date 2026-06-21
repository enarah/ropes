import type {
  DemoVehicle,
  DemoVehiclePreStartChecklist,
} from "@/lib/vehicles-data";

type VehiclePreStartFormProps = {
  action?: (formData: FormData) => void | Promise<void>;
  latestPreStart?: DemoVehiclePreStartChecklist | null;
  organisationId?: string;
  organisationName: string;
  organisationSlug: string;
  persistenceEnabled: boolean;
  vehicle: DemoVehicle;
};

const checks = [
  { label: "Tyres", name: "tyresOk" },
  { label: "Lights", name: "lightsOk" },
  { label: "Fluids", name: "fluidsOk" },
  { label: "Communications", name: "communicationsOk" },
  { label: "Recovery gear", name: "recoveryGearOk" },
  { label: "General condition", name: "generalConditionOk" },
];

export function VehiclePreStartForm({
  action,
  latestPreStart,
  organisationId,
  organisationName,
  organisationSlug,
  persistenceEnabled,
  vehicle,
}: VehiclePreStartFormProps) {
  return (
    <form action={action} className="space-y-5">
      <input name="organisationSlug" type="hidden" value={organisationSlug} />
      <input name="organisationId" type="hidden" value={organisationId ?? ""} />
      <input name="vehicleId" type="hidden" value={vehicle.id} />

      <div className="rounded-md border border-earth-200 bg-earth-50 p-4">
        <p className="text-sm font-semibold text-charcoal-950">
          Organisation scoped
        </p>
        <p className="text-sm leading-6 text-charcoal-600">
          This pre-start checklist is for {vehicle.name} in {organisationName}.{" "}
          {persistenceEnabled
            ? "Submitting records a tenant-guarded checklist only; it does not change bookings or create maintenance records."
            : "No local database is available, so the form keeps demo-only behaviour."}
        </p>
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-charcoal-800">
          Odometer kilometres
        </span>
        <input
          className="mt-2 w-full rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600"
          defaultValue={latestPreStart?.odometerKm ?? vehicle.odometerKm}
          max={2_000_000}
          min={0}
          name="odometerKm"
          required
          type="number"
        />
      </label>

      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="sr-only">Pre-start checks</legend>
        {checks.map((check) => (
          <CheckControl key={check.name} label={check.label} name={check.name} />
        ))}
      </fieldset>

      <label className="block">
        <span className="text-sm font-semibold text-charcoal-800">
          Issue notes
        </span>
        <textarea
          className="mt-2 min-h-28 w-full rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600"
          maxLength={500}
          name="issueNotes"
          placeholder="Short safe notes only. Do not enter private personal information."
        />
      </label>

      <button
        className="rounded-md bg-ochre-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
        type="submit"
      >
        {persistenceEnabled ? "Submit pre-start" : "Submit demo pre-start"}
      </button>
    </form>
  );
}

function CheckControl({ label, name }: { label: string; name: string }) {
  return (
    <fieldset className="rounded-md border border-earth-200 bg-white p-4">
      <legend className="text-sm font-semibold text-charcoal-800">
        {label}
      </legend>
      <div className="mt-3 flex flex-wrap gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-charcoal-700">
          <input name={name} required type="radio" value="pass" />
          Pass
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-charcoal-700">
          <input name={name} required type="radio" value="fail" />
          Issue
        </label>
      </div>
    </fieldset>
  );
}
