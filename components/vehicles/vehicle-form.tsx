"use client";

import { useState } from "react";
import type { VehicleFormDefaults } from "@/lib/vehicles-data";

type VehicleFormProps = {
  action?: (formData: FormData) => void | Promise<void>;
  defaults: VehicleFormDefaults;
  mode: "create" | "edit";
  organisationId?: string;
  organisationName: string;
  organisationSlug: string;
  persistenceEnabled: boolean;
};

const vehicleStatuses: Array<{
  label: string;
  value: VehicleFormDefaults["status"];
}> = [
  { label: "Available", value: "AVAILABLE" },
  { label: "Booked", value: "BOOKED" },
  { label: "Maintenance", value: "MAINTENANCE" },
  { label: "Retired", value: "RETIRED" },
];

export function VehicleForm({
  action,
  defaults,
  mode,
  organisationId,
  organisationName,
  organisationSlug,
  persistenceEnabled,
}: VehicleFormProps) {
  const [message, setMessage] = useState("");

  return (
    <form
      action={action}
      className="space-y-5"
      onSubmit={
        action
          ? undefined
          : (event) => {
              event.preventDefault();
              setMessage("Demo only: this vehicle record is not saved yet.");
            }
      }
    >
      <input name="organisationSlug" type="hidden" value={organisationSlug} />
      <input name="organisationId" type="hidden" value={organisationId ?? ""} />
      <input name="vehicleId" type="hidden" value={defaults.id ?? ""} />

      <div className="rounded-md border border-earth-200 bg-earth-50 p-4">
        <p className="text-sm font-semibold text-charcoal-950">
          Organisation scoped
        </p>
        <p className="text-sm leading-6 text-charcoal-600">
          This vehicle {mode === "create" ? "record" : "edit"} is for{" "}
          {organisationName}. It uses the resolved auth/session context and{" "}
          {persistenceEnabled
            ? "persists a tenant-guarded vehicle record without changing existing bookings."
            : "does not persist because a local database is not available."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          defaultValue={defaults.name}
          label="Vehicle name"
          name="name"
        />
        <Field
          defaultValue={defaults.registration}
          label="Registration"
          name="registration"
        />
        <Field defaultValue={defaults.make} label="Make" name="make" />
        <Field defaultValue={defaults.model} label="Model" name="model" />
        <Field
          defaultValue={defaults.year}
          label="Year"
          max={new Date().getFullYear() + 1}
          min={1950}
          name="year"
          required={false}
          type="number"
        />
        <Field
          defaultValue={defaults.odometerKm}
          label="Odometer kilometres"
          max={2_000_000}
          min={0}
          name="odometerKm"
          required={false}
          type="number"
        />
        <label className="block md:col-span-2">
          <span className="text-sm font-semibold text-charcoal-800">
            Status
          </span>
          <select
            className="mt-2 w-full rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600"
            defaultValue={defaults.status}
            name="status"
            required
          >
            {vehicleStatuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          className="rounded-md bg-ochre-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
          type="submit"
        >
          {persistenceEnabled
            ? mode === "create"
              ? "Create vehicle"
              : "Save vehicle"
            : "Save demo vehicle"}
        </button>
        {message ? (
          <p className="text-sm font-medium text-ochre-800">{message}</p>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  defaultValue,
  label,
  max,
  min,
  name,
  required = true,
  type = "text",
}: {
  defaultValue: string;
  label: string;
  max?: number;
  min?: number;
  name: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-charcoal-800">{label}</span>
      <input
        className="mt-2 w-full rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600"
        defaultValue={defaultValue}
        max={max}
        min={min}
        name={name}
        required={required}
        type={type}
      />
    </label>
  );
}
