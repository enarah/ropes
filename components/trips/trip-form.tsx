"use client";

import { useState } from "react";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { DemoTrip } from "@/lib/trips-data";

type TripFormProps = {
  action?: (formData: FormData) => void | Promise<void>;
  mode: "create" | "edit";
  organisationName: string;
  organisationId?: string;
  organisationSlug: string;
  persistenceEnabled: boolean;
  trip: DemoTrip;
};

type ParticipantRow = DemoTrip["participants"][number] & { rowId: string };
type VehicleRow = DemoTrip["vehicles"][number] & { rowId: string };
type ItineraryRow = DemoTrip["itinerary"][number] & { rowId: string };

const participantStatuses: Array<ParticipantRow["status"]> = [
  "Confirmed",
  "Pending",
];
const vehicleStatuses: Array<VehicleRow["status"]> = [
  "Allocated",
  "Requested",
];

export function TripForm({
  action,
  mode,
  organisationName,
  organisationId,
  organisationSlug,
  persistenceEnabled,
  trip,
}: TripFormProps) {
  const [message, setMessage] = useState("");
  const [participants, setParticipants] = useState<ParticipantRow[]>(
    () => withRowIds(trip.participants, "participant"),
  );
  const [vehicles, setVehicles] = useState<VehicleRow[]>(
    () => withRowIds(trip.vehicles, "vehicle"),
  );
  const [itinerary, setItinerary] = useState<ItineraryRow[]>(
    () => withRowIds(trip.itinerary, "itinerary"),
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
              setMessage("Demo only: this trip form is not saved yet.");
            }
      }
    >
      <input name="mode" type="hidden" value={mode} />
      <input name="organisationSlug" type="hidden" value={organisationSlug} />
      <input name="tripId" type="hidden" value={mode === "edit" ? trip.id : ""} />
      <input name="organisationId" type="hidden" value={organisationId ?? ""} />

      <div className="rounded-md border border-earth-200 bg-earth-50 p-4">
        <p className="text-sm font-semibold text-charcoal-950">
          Organisation scoped
        </p>
        <p className="text-sm leading-6 text-charcoal-600">
          This {mode === "create" ? "new" : "edit"} form is for{" "}
          {organisationName}. It uses the resolved auth/session context and{" "}
          {persistenceEnabled
            ? "persists core trip details, participants, vehicle allocations and itinerary rows through tenant-guarded Prisma writes."
            : "does not persist because a local database is not available."}
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
          required
        />
      </label>

      <RepeatableSection
        addLabel="Add participant"
        description="Free-text participant rows are saved with this organisation-scoped trip."
        onAdd={() =>
          setParticipants((rows) => [
            ...rows,
            {
              name: "",
              role: "",
              rowId: createRowId("participant"),
              status: "Pending",
            },
          ])
        }
        title="Participants"
      >
        {participants.map((participant, index) => (
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_10rem_auto]" key={participant.rowId}>
            <Field
              label="Name"
              name={`participants[${index}][name]`}
              required={false}
              value={participant.name}
              onChange={(value) =>
                updateRow(setParticipants, participant.rowId, { name: value })
              }
            />
            <Field
              label="Role"
              name={`participants[${index}][role]`}
              required={false}
              value={participant.role}
              onChange={(value) =>
                updateRow(setParticipants, participant.rowId, { role: value })
              }
            />
            <SelectField
              label="Status"
              name={`participants[${index}][status]`}
              onChange={(value) =>
                updateRow(setParticipants, participant.rowId, {
                  status: value as ParticipantRow["status"],
                })
              }
              options={participantStatuses}
              value={participant.status}
            />
            <RemoveButton
              disabled={participants.length === 1}
              label="Remove participant"
              onClick={() =>
                setParticipants((rows) =>
                  removeRow(rows, participant.rowId, emptyParticipantRow),
                )
              }
            />
          </div>
        ))}
      </RepeatableSection>

      <RepeatableSection
        addLabel="Add vehicle"
        description="Vehicle allocation rows are saved and linked to matching organisation vehicles when the registration matches."
        onAdd={() =>
          setVehicles((rows) => [
            ...rows,
            {
              name: "",
              registration: "",
              rowId: createRowId("vehicle"),
              status: "Requested",
            },
          ])
        }
        title="Vehicles"
      >
        {vehicles.map((vehicle, index) => (
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_10rem_auto]" key={vehicle.rowId}>
            <Field
              label="Vehicle"
              name={`vehicles[${index}][name]`}
              required={false}
              value={vehicle.name}
              onChange={(value) =>
                updateRow(setVehicles, vehicle.rowId, { name: value })
              }
            />
            <Field
              label="Registration"
              name={`vehicles[${index}][registration]`}
              required={false}
              value={vehicle.registration}
              onChange={(value) =>
                updateRow(setVehicles, vehicle.rowId, { registration: value })
              }
            />
            <SelectField
              label="Status"
              name={`vehicles[${index}][status]`}
              onChange={(value) =>
                updateRow(setVehicles, vehicle.rowId, {
                  status: value as VehicleRow["status"],
                })
              }
              options={vehicleStatuses}
              value={vehicle.status}
            />
            <RemoveButton
              disabled={vehicles.length === 1}
              label="Remove vehicle"
              onClick={() =>
                setVehicles((rows) =>
                  removeRow(rows, vehicle.rowId, emptyVehicleRow),
                )
              }
            />
          </div>
        ))}
      </RepeatableSection>

      <RepeatableSection
        addLabel="Add itinerary item"
        description="Itinerary rows are saved in this order for the selected organisation."
        onAdd={() =>
          setItinerary((rows) => [
            ...rows,
            {
              day: `Day ${rows.length + 1}`,
              description: "",
              rowId: createRowId("itinerary"),
              title: "",
            },
          ])
        }
        title="Itinerary"
      >
        {itinerary.map((item, index) => (
          <div className="grid gap-3 lg:grid-cols-[8rem_1fr_1.5fr_auto]" key={item.rowId}>
            <Field
              label="Day"
              name={`itinerary[${index}][day]`}
              required={false}
              value={item.day}
              onChange={(value) =>
                updateRow(setItinerary, item.rowId, { day: value })
              }
            />
            <Field
              label="Title"
              name={`itinerary[${index}][title]`}
              required={false}
              value={item.title}
              onChange={(value) =>
                updateRow(setItinerary, item.rowId, { title: value })
              }
            />
            <Field
              label="Description"
              name={`itinerary[${index}][description]`}
              required={false}
              value={item.description}
              onChange={(value) =>
                updateRow(setItinerary, item.rowId, { description: value })
              }
            />
            <RemoveButton
              disabled={itinerary.length === 1}
              label="Remove itinerary item"
              onClick={() =>
                setItinerary((rows) =>
                  removeRow(rows, item.rowId, emptyItineraryRow),
                )
              }
            />
          </div>
        ))}
      </RepeatableSection>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          className="rounded-md bg-ochre-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
          type="submit"
        >
          {persistenceEnabled ? "Save trip" : "Save demo draft"}
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

function RepeatableSection({
  addLabel,
  children,
  description,
  onAdd,
  title,
}: {
  addLabel: string;
  children: React.ReactNode;
  description: string;
  onAdd: () => void;
  title: string;
}) {
  return (
    <section className="rounded-md border border-earth-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-charcoal-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-charcoal-600">
            {description}
          </p>
        </div>
        <button
          className="inline-flex w-fit items-center gap-2 rounded-md border border-earth-300 bg-white px-3 py-2 text-sm font-semibold text-charcoal-800"
          onClick={onAdd}
          type="button"
        >
          <Plus aria-hidden="true" size={16} />
          {addLabel}
        </button>
      </div>
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
  );
}

function Field({
  defaultValue,
  label,
  name,
  onChange,
  required = true,
  type = "text",
  value,
}: {
  defaultValue?: string;
  label: string;
  name: string;
  onChange?: (value: string) => void;
  required?: boolean;
  type?: string;
  value?: string;
}) {
  const inputProps =
    value === undefined
      ? { defaultValue }
      : {
          onChange: (event: ChangeEvent<HTMLInputElement>) =>
            onChange?.(event.target.value),
          value,
        };

  return (
    <label className="block">
      <span className="text-sm font-semibold text-charcoal-800">{label}</span>
      <input
        className="mt-2 w-full rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600"
        name={name}
        required={required}
        type={type}
        {...inputProps}
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  onChange,
  options,
  value,
}: {
  label: string;
  name: string;
  onChange: (value: string) => void;
  options: readonly string[];
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-charcoal-800">{label}</span>
      <select
        className="mt-2 w-full rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600"
        name={name}
        onChange={(event) => onChange(event.target.value)}
        required
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function RemoveButton({
  disabled,
  label,
  onClick,
}: {
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="mt-7 inline-flex h-10 w-10 items-center justify-center rounded-md border border-earth-300 bg-white text-charcoal-800 disabled:cursor-not-allowed disabled:opacity-40"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Trash2 aria-hidden="true" size={16} />
    </button>
  );
}

function withRowIds<T>(rows: T[], prefix: string) {
  const starterRows = rows.length ? rows : [createEmptyRow(prefix) as T];

  return starterRows.map((row, index) => ({
    ...row,
    rowId: `${prefix}-${index}`,
  }));
}

function updateRow<T extends { rowId: string }>(
  setRows: Dispatch<SetStateAction<T[]>>,
  rowId: string,
  changes: Partial<T>,
) {
  setRows((rows) =>
    rows.map((row) => (row.rowId === rowId ? { ...row, ...changes } : row)),
  );
}

function removeRow<T extends { rowId: string }>(
  rows: T[],
  rowId: string,
  createFallback: () => T,
) {
  const nextRows = rows.filter((row) => row.rowId !== rowId);

  return nextRows.length ? nextRows : [createFallback()];
}

function emptyParticipantRow(): ParticipantRow {
  return {
    name: "",
    role: "",
    rowId: createRowId("participant"),
    status: "Pending",
  };
}

function emptyVehicleRow(): VehicleRow {
  return {
    name: "",
    registration: "",
    rowId: createRowId("vehicle"),
    status: "Requested",
  };
}

function emptyItineraryRow(): ItineraryRow {
  return {
    day: "Day 1",
    description: "",
    rowId: createRowId("itinerary"),
    title: "",
  };
}

function createEmptyRow(prefix: string) {
  if (prefix === "participant") {
    return emptyParticipantRow();
  }

  if (prefix === "vehicle") {
    return emptyVehicleRow();
  }

  return emptyItineraryRow();
}

function createRowId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toDateTimeLocal(value: string) {
  if (!value) {
    return "";
  }

  return value.slice(0, 16);
}
