"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { DemoVehicle, DemoVehicleBooking } from "@/lib/vehicles-data";

type BookingDefaults = {
  vehicleId: string;
  tripTitle: string;
  requestedBy: string;
  startsAt: string;
  endsAt: string;
  purpose: string;
};

type VehicleBookingFormProps = {
  bookings: DemoVehicleBooking[];
  defaults: BookingDefaults;
  organisationName: string;
  vehicles: DemoVehicle[];
};

export function VehicleBookingForm({
  bookings,
  defaults,
  organisationName,
  vehicles,
}: VehicleBookingFormProps) {
  const [vehicleId, setVehicleId] = useState(defaults.vehicleId);
  const [startsAt, setStartsAt] = useState(toDateTimeLocal(defaults.startsAt));
  const [endsAt, setEndsAt] = useState(toDateTimeLocal(defaults.endsAt));
  const [message, setMessage] = useState("");

  const overlaps = useMemo(
    () => findOverlaps(bookings, vehicleId, startsAt, endsAt),
    [bookings, vehicleId, startsAt, endsAt],
  );

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(
          overlaps.length
            ? "Demo warning shown: this booking is not saved."
            : "Demo only: this booking form is not saved yet.",
        );
      }}
    >
      <div className="rounded-md border border-earth-200 bg-earth-50 p-4">
        <p className="text-sm font-semibold text-charcoal-950">
          Organisation scoped
        </p>
        <p className="text-sm leading-6 text-charcoal-600">
          This fake booking request is for {organisationName}. It uses demo
          vehicle data and does not persist.
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
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-charcoal-800">Purpose</span>
        <textarea
          className="mt-2 min-h-28 w-full rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600"
          defaultValue={defaults.purpose}
          name="purpose"
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
          Save demo booking
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
    if (booking.vehicleId !== vehicleId || booking.status === "Cancelled") {
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
