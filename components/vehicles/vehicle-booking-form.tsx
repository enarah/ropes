"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type {
  DemoVehicle,
  DemoVehicleBooking,
  VehicleBookingFormDefaults,
} from "@/lib/vehicles-data";

type VehicleBookingFormProps = {
  action?: (formData: FormData) => void | Promise<void>;
  bookings: DemoVehicleBooking[];
  defaults: VehicleBookingFormDefaults;
  mode?: "create" | "edit";
  organisationName: string;
  organisationId?: string;
  organisationSlug: string;
  persistenceEnabled: boolean;
  vehicles: DemoVehicle[];
};

export function VehicleBookingForm({
  action,
  bookings,
  defaults,
  mode = "create",
  organisationName,
  organisationId,
  organisationSlug,
  persistenceEnabled,
  vehicles,
}: VehicleBookingFormProps) {
  const [vehicleId, setVehicleId] = useState(defaults.vehicleId);
  const [startsAt, setStartsAt] = useState(toDateTimeLocal(defaults.startsAt));
  const [endsAt, setEndsAt] = useState(toDateTimeLocal(defaults.endsAt));
  const [message, setMessage] = useState("");

  const overlaps = useMemo(
    () => findOverlaps(bookings, vehicleId, startsAt, endsAt, defaults.id),
    [bookings, defaults.id, vehicleId, startsAt, endsAt],
  );

  return (
    <form
      action={action}
      className="space-y-5"
      onSubmit={
        action
          ? undefined
          : (event) => {
              event.preventDefault();
              setMessage(
                overlaps.length
                  ? "Demo warning shown: this booking is not saved."
                  : "Demo only: this booking form is not saved yet.",
              );
            }
      }
    >
      <input name="organisationSlug" type="hidden" value={organisationSlug} />
      <input name="organisationId" type="hidden" value={organisationId ?? ""} />
      <input name="bookingId" type="hidden" value={defaults.id ?? ""} />

      <div className="rounded-md border border-earth-200 bg-earth-50 p-4">
        <p className="text-sm font-semibold text-charcoal-950">
          Organisation scoped
        </p>
        <p className="text-sm leading-6 text-charcoal-600">
          This booking request is for {organisationName}. It checks overlaps
          only within this organisation context, uses the resolved auth/session
          context and{" "}
          {persistenceEnabled
            ? mode === "edit"
              ? "persists tenant-guarded booking updates without changing broader scheduling workflows."
              : "persists a tenant-guarded booking request."
            : "does not persist because a local database is not available."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-charcoal-800">
            Vehicle
          </span>
          <select
            className="mt-2 w-full rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600"
            name="vehicleId"
            onChange={(event) => setVehicleId(event.target.value)}
            required
            value={vehicleId}
          >
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.name} / {vehicle.registration}
              </option>
            ))}
          </select>
        </label>
        <Field
          defaultValue={defaults.tripTitle}
          label="Trip or purpose title"
          name="tripTitle"
        />
        <Field
          defaultValue={defaults.requestedBy}
          label="Requested by"
          name="requestedBy"
        />
        <Field
          defaultValue={startsAt}
          label="Start"
          name="startsAt"
          onChange={setStartsAt}
          type="datetime-local"
        />
        <Field
          defaultValue={endsAt}
          label="End"
          name="endsAt"
          onChange={setEndsAt}
          type="datetime-local"
        />
        {mode === "edit" ? (
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
              <option value="REQUESTED">Requested</option>
              <option value="APPROVED">Approved</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>
        ) : null}
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-charcoal-800">Purpose</span>
        <textarea
          className="mt-2 min-h-28 w-full rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600"
          defaultValue={defaults.purpose}
          name="purpose"
          required
        />
      </label>

      {overlaps.length ? (
        <div className="rounded-md border border-ochre-300 bg-ochre-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle
              aria-hidden="true"
              className="mt-0.5 text-ochre-800"
              size={18}
            />
            <div>
              <p className="text-sm font-semibold text-ochre-900">
                Booking overlap warning
              </p>
              <div className="mt-2 space-y-2">
                {overlaps.map((booking) => (
                  <p
                    className="text-sm leading-6 text-charcoal-700"
                    key={booking.id}
                  >
                    {booking.tripTitle} already uses this vehicle from{" "}
                    {formatDateTime(booking.startsAt)} to{" "}
                    {formatDateTime(booking.endsAt)}.
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          className="rounded-md bg-ochre-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
          type="submit"
        >
          {persistenceEnabled
            ? mode === "edit"
              ? "Save booking changes"
              : "Save booking"
            : "Save demo booking"}
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
  name,
  onChange,
  type = "text",
}: {
  defaultValue: string;
  label: string;
  name: string;
  onChange?: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-charcoal-800">{label}</span>
      <input
        className="mt-2 w-full rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600"
        defaultValue={defaultValue}
        name={name}
        onChange={(event) => onChange?.(event.target.value)}
        required
        type={type}
      />
    </label>
  );
}

function findOverlaps(
  bookings: DemoVehicleBooking[],
  vehicleId: string,
  startsAt: string,
  endsAt: string,
  ignoredBookingId?: string,
) {
  if (!vehicleId || !startsAt || !endsAt) {
    return [];
  }

  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || start >= end) {
    return [];
  }

  return bookings.filter((booking) => {
    if (
      booking.id === ignoredBookingId ||
      booking.vehicleId !== vehicleId ||
      booking.status === "Cancelled"
    ) {
      return false;
    }

    const bookingStart = new Date(booking.startsAt).getTime();
    const bookingEnd = new Date(booking.endsAt).getTime();

    return start < bookingEnd && end > bookingStart;
  });
}

function toDateTimeLocal(value: string) {
  if (!value) {
    return "";
  }

  return value.slice(0, 16);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
