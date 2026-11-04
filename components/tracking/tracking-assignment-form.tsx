"use client";

import { useState } from "react";
import { tripTrackingRoles, unallocatedTrackingVehicleWarning, outsideTripTrackingWindowWarning } from "@/lib/tracking/trip-assignment-input";
import type { TripTrackingFormDTO, TripTrackingInput, TripTrackingRole } from "@/lib/tracking/types";

const control = "mt-2 w-full min-w-0 rounded-md border border-earth-200 bg-white px-3 py-2 text-sm outline-none focus:border-ochre-600";

export function TrackingAssignmentForm({ data, allocatedRegistrations, tripStartsAt, tripEndsAt }: {
  data: TripTrackingFormDTO; allocatedRegistrations: string[]; tripStartsAt: string; tripEndsAt: string;
}) {
  const [rows, setRows] = useState(() => data.assignments.map((assignment, index) => ({
    assetId: assignment.assetId, role: assignment.role, vehicleId: assignment.vehicleId,
    assignedFrom: assignment.assignedFrom?.slice(0, 16) ?? "", assignedUntil: assignment.assignedUntil?.slice(0, 16) ?? "",
    notes: assignment.notes ?? "", key: `existing-${index}`,
  })));
  const vehicles = [...data.vehicles].sort((a, b) => Number(allocatedRegistrations.includes(b.registration)) -
    Number(allocatedRegistrations.includes(a.registration)) || a.name.localeCompare(b.name));
  function update(index: number, values: Partial<TripTrackingInput>) {
    setRows((current) => current.map((row, i) => i === index ? { ...row, ...values,
      assignedFrom: values.assignedFrom === undefined ? row.assignedFrom : values.assignedFrom ?? "",
      assignedUntil: values.assignedUntil === undefined ? row.assignedUntil : values.assignedUntil ?? "",
      notes: values.notes === undefined ? row.notes : values.notes ?? "" } : row));
  }
  return (
    <section className="min-w-0 rounded-md border border-earth-200 bg-white p-4 shadow-sm">
      <input name="trackingAssignmentCount" type="hidden" value={rows.length} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-charcoal-950">Tracking &amp; Communications</h2>
          <p className="mt-1 text-sm leading-6 text-charcoal-600">Assign trackers for this trip. Blank assignment dates use the trip dates. All dates are UTC.</p>
        </div>
        <button className="w-fit shrink-0 rounded-md border border-earth-300 px-3 py-2 text-sm font-semibold" type="button"
          disabled={rows.length >= 100 || !data.assets.some((asset) => asset.status === "ACTIVE")}
          onClick={() => setRows((current) => [...current, { assetId: "", role: "PRIMARY", vehicleId: null,
            assignedFrom: "", assignedUntil: "", notes: "", key: `new-${Date.now()}-${Math.random().toString(36).slice(2)}` }])}>Add tracker</button>
      </div>
      {!rows.length ? <p className="mt-4 text-sm text-charcoal-600">No tracking device is assigned to this trip.</p> : null}
      {!data.assets.some((asset) => asset.status === "ACTIVE") ? <p className="mt-3 text-sm text-charcoal-600">No active trackers are available for this organisation.</p> : null}
      <p className="mt-3 text-xs leading-5 text-charcoal-600">Primary — main tracker for this Trip. Support — additional vehicle/team tracker. Person — carried by a person. Other — other operational use.</p>
      <div className="mt-4 space-y-4">
        {rows.map((row, index) => {
          const asset = data.assets.find((option) => option.assetId === row.assetId);
          const vehicle = data.vehicles.find((option) => option.id === row.vehicleId);
          const effectiveFrom = row.assignedFrom || tripStartsAt;
          const effectiveUntil = row.assignedUntil || tripEndsAt;
          const outsideTrip = effectiveFrom && effectiveUntil && tripStartsAt && tripEndsAt &&
            (effectiveFrom > tripEndsAt || effectiveUntil < tripStartsAt);
          const name = (field: string) => `tracking[${index}][${field}]`;
          return <fieldset className="min-w-0 rounded-md border border-earth-200 bg-earth-50 p-3" key={row.key}>
            <legend className="px-1 text-sm font-semibold">Tracker {index + 1}</legend>
            <div className="grid min-w-0 gap-3 md:grid-cols-2">
              <label className="min-w-0 text-sm font-semibold">Tracker
                <select className={control} name={name("assetId")} required value={row.assetId} onChange={(e) => update(index, { assetId: e.target.value })}>
                  <option value="">Choose a tracker</option>
                  {data.assets.filter((option) => option.status === "ACTIVE" || option.assetId === row.assetId).map((option) =>
                    <option key={option.assetId} value={option.assetId} disabled={rows.some((other, i) => i !== index && other.assetId === option.assetId)}>
                      {option.displayName} — {option.provider}{option.model ? ` / ${option.model}` : ""}{option.status !== "ACTIVE" ? ` (${option.status.toLowerCase()})` : ""}
                    </option>)}
                </select>
              </label>
              <label className="min-w-0 text-sm font-semibold">Role
                <select className={control} name={name("role")} value={row.role} onChange={(e) => update(index, { role: e.target.value as TripTrackingRole })}>
                  {Object.entries(tripTrackingRoles).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </label>
              <label className="min-w-0 text-sm font-semibold">Vehicle (optional)
                <select className={control} name={name("vehicleId")} value={row.vehicleId ?? ""} onChange={(e) => update(index, { vehicleId: e.target.value || null })}>
                  <option value="">No vehicle</option>
                  {vehicles.map((option) => <option key={option.id} value={option.id}>{option.name} — {option.registration}{allocatedRegistrations.includes(option.registration) ? " (trip vehicle)" : ""}</option>)}
                </select>
              </label>
              <p className="self-center text-sm text-charcoal-600">Tracking interval: {asset?.expectedTrackingIntervalMinutes ? `${asset.expectedTrackingIntervalMinutes} minutes` : "Not configured"}. Set on the tracker; read-only here.</p>
              <label className="min-w-0 text-sm font-semibold">Assigned from (UTC)
                <input className={control} type="datetime-local" name={name("assignedFrom")} value={row.assignedFrom} onChange={(e) => update(index, { assignedFrom: e.target.value })} />
              </label>
              <label className="min-w-0 text-sm font-semibold">Assigned until (UTC)
                <input className={control} type="datetime-local" name={name("assignedUntil")} value={row.assignedUntil} onChange={(e) => update(index, { assignedUntil: e.target.value })} />
              </label>
            </div>
            {vehicle && !allocatedRegistrations.includes(vehicle.registration) ? <p className="mt-3 text-sm font-medium text-ochre-800">{unallocatedTrackingVehicleWarning}</p> : null}
            {outsideTrip ? <p className="mt-3 text-sm font-medium text-ochre-800">{outsideTripTrackingWindowWarning}</p> : null}
            <label className="mt-3 block text-sm font-semibold">Notes
              <textarea className={control} rows={2} name={name("notes")} maxLength={500} value={row.notes} onChange={(e) => update(index, { notes: e.target.value })} />
            </label>
            <p className="text-xs text-charcoal-500">Plain text, up to 500 characters.</p>
            <button className="mt-3 rounded-md border border-earth-300 bg-white px-3 py-2 text-sm font-semibold" type="button"
              onClick={() => setRows((current) => current.filter((_, i) => i !== index))}>Remove tracker {index + 1}</button>
          </fieldset>;
        })}
      </div>
    </section>
  );
}
