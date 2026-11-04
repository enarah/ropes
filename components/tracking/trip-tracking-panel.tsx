import Link from "next/link";
import type { TripTrackingAssignmentDTO } from "@/lib/tracking/types";
import { freshnessLabels, trackingMessageLabel } from "@/lib/tracking/presentation";
import { tripTrackingRoles, unallocatedTrackingVehicleWarning, outsideTripTrackingWindowWarning } from "@/lib/tracking/trip-assignment-input";

function timestamp(value: string | null) {
  return value ? value.replace("T", " ").replace(/\.\d{3}Z$/, " UTC") : "Not received";
}
export function TripTrackingSummary({ assignments, warnIfUnassigned = false }: {
  assignments: TripTrackingAssignmentDTO[]; warnIfUnassigned?: boolean;
}) {
  return <div className="space-y-3 text-sm leading-6 text-charcoal-700">
    {!assignments.length ? <p className={warnIfUnassigned ? "rounded-md border border-ochre-300 bg-earth-50 p-3 font-semibold text-ochre-800" : ""}>
      {warnIfUnassigned ? "No tracking device has been assigned to this trip." : "No structured tracking device assigned"}
    </p> : assignments.map((assignment) => <div key={assignment.assetId}>
      <p>Assigned tracking: <strong>{assignment.displayName}</strong> — {tripTrackingRoles[assignment.role]}{assignment.vehicle ? ` — ${assignment.vehicle.name}` : ""}</p>
      <p>Expected tracking interval: {assignment.expectedTrackingIntervalMinutes ? `${assignment.expectedTrackingIntervalMinutes} minutes` : "Not configured"}</p>
    </div>)}
  </div>;
}
export function TripTrackingPanel({ assignments, organisationSlug }: {
  assignments: TripTrackingAssignmentDTO[]; organisationSlug: string;
}) {
  return <section className="min-w-0 rounded-md border border-earth-200 bg-white p-5 shadow-sm">
    <h2 className="text-xl font-semibold text-charcoal-950">Tracking &amp; Communications</h2>
    {!assignments.length ? <p className="mt-4 text-sm text-charcoal-600">No tracking device is assigned to this trip.</p> : null}
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      {assignments.map((assignment) => <article className="min-w-0 space-y-2 rounded-md border border-earth-200 bg-earth-50 p-4 text-sm text-charcoal-700" key={assignment.assetId}>
        <h3 className="break-words text-base font-semibold text-charcoal-950">{assignment.displayName}</h3>
        <p>{assignment.provider}{assignment.model ? ` / ${assignment.model}` : ""} · {tripTrackingRoles[assignment.role]} · {assignment.status.toLowerCase()}</p>
        <p>Vehicle: {assignment.vehicle ? `${assignment.vehicle.name} — ${assignment.vehicle.registration}` : "None assigned"}</p>
        {assignment.vehicleNotAllocated ? <p className="font-medium text-ochre-800">{unallocatedTrackingVehicleWarning}</p> : null}
        <p>Effective assignment: {timestamp(assignment.effectiveFrom)} to {timestamp(assignment.effectiveUntil)}</p>
        {assignment.windowOutsideTrip ? <p className="font-medium text-ochre-800">{outsideTripTrackingWindowWarning}</p> : null}
        <p>Tracking interval: {assignment.expectedTrackingIntervalMinutes ? `${assignment.expectedTrackingIntervalMinutes} minutes` : "Not configured"}</p>
        <p>Latest valid position: {timestamp(assignment.latestPositionAt)}</p>
        <p>Latest message: {timestamp(assignment.latestMessageAt)} · {trackingMessageLabel(assignment.latestMessageKind)}</p>
        <p className="font-semibold">{freshnessLabels[assignment.freshness]}</p>
        {assignment.notes ? <p className="whitespace-pre-wrap break-words">{assignment.notes}</p> : null}
      </article>)}
    </div>
    <Link className="mt-4 inline-block rounded-md border border-earth-300 px-3 py-2 text-sm font-semibold text-charcoal-800"
      href={`/?org=${encodeURIComponent(organisationSlug)}#operations-map-heading`}>View on Operations Map</Link>
  </section>;
}
