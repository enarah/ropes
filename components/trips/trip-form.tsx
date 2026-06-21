"use client";

import { useState } from "react";
import type { DemoTrip } from "@/lib/trips-data";

type TripFormProps = {
  mode: "create" | "edit";
  organisationName: string;
  trip: DemoTrip;
};

export function TripForm({ mode, organisationName, trip }: TripFormProps) {
  const [message, setMessage] = useState("");

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage("Demo only: this trip form is not saved yet.");
      }}
    >
      <div className="rounded-md border border-earth-200 bg-earth-50 p-4">
        <p className="text-sm font-semibold text-charcoal-950">
          Organisation scoped
        </p>
        <p className="text-sm leading-6 text-charcoal-600">
          This {mode === "create" ? "new" : "edit"} form is for{" "}
          {organisationName}. It uses fake session data and does not persist.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Trip title" name="title" defaultValue={trip.title} />
        <Field
          label="Destination"
          name="destination"
          defaultValue={trip.destination}
        />
        <Field label="Lead" name="lead" defaultValue={trip.lead} />
        <Field
          label="Emergency contact"
          name="emergencyContact"
          defaultValue={trip.emergencyContact}
        />
        <Field
          label="Start"
          name="startsAt"
          type="datetime-local"
          defaultValue={toDateTimeLocal(trip.startsAt)}
        />
        <Field
          label="End"
          name="endsAt"
          type="datetime-local"
          defaultValue={toDateTimeLocal(trip.endsAt)}
        />
      </div>

      <label className="block">
        <span className="text-sm font-semibold text-charcoal-800">Purpose</span>
        <textarea
          className="mt-2 min-h-28 w-full rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600"
          defaultValue={trip.purpose}
          name="purpose"
        />
      </label>

      <div className="grid gap-4 lg:grid-cols-3">
        <TextareaList
          label="Participants"
          value={trip.participants
            .map((participant) => `${participant.name} - ${participant.role}`)
            .join("\n")}
        />
        <TextareaList
          label="Vehicles"
          value={trip.vehicles
            .map((vehicle) => `${vehicle.name} - ${vehicle.registration}`)
            .join("\n")}
        />
        <TextareaList
          label="Itinerary"
          value={trip.itinerary
            .map((item) => `${item.day}: ${item.title} - ${item.description}`)
            .join("\n")}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          className="rounded-md bg-ochre-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
          type="submit"
        >
          Save demo draft
        </button>
        <button
          className="rounded-md border border-earth-300 bg-white px-4 py-2 text-sm font-semibold text-charcoal-800"
          type="button"
          onClick={() => setMessage("Demo only: export is a future action.")}
        >
          Export placeholder
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
  type = "text",
}: {
  defaultValue: string;
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-charcoal-800">{label}</span>
      <input
        className="mt-2 w-full rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600"
        defaultValue={defaultValue}
        name={name}
        type={type}
      />
    </label>
  );
}

function TextareaList({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-charcoal-800">{label}</span>
      <textarea
        className="mt-2 min-h-36 w-full rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600"
        defaultValue={value}
      />
    </label>
  );
}

function toDateTimeLocal(value: string) {
  if (!value) {
    return "";
  }

  return value.slice(0, 16);
}
