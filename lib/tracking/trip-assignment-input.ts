import type { TripTrackingInput, TripTrackingRole } from "./types";

export const tripTrackingRoles: Readonly<Record<TripTrackingRole, string>> = {
  PRIMARY: "Primary", SUPPORT: "Support", PERSON: "Person", OTHER: "Other",
};
export const unallocatedTrackingVehicleWarning =
  "This vehicle is not currently listed in the trip vehicle allocation.";

export const outsideTripTrackingWindowWarning = "This assignment window does not overlap the trip dates.";

export class TripTrackingValidationError extends Error {}

export function assignmentDate(value: string | null): Date | null {
  if (!value) return null;
  // Assignment controls use UTC, including datetime-local values without a suffix.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?Z?$/.test(value)) {
    throw new TripTrackingValidationError("Assignment dates must be valid UTC dates.");
  }
  const date = new Date(value.endsWith("Z") ? value : `${value}Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 16) !== value.slice(0, 16)) {
    throw new TripTrackingValidationError("Assignment dates must be valid UTC dates.");
  }
  return date;
}

export function normaliseTripTrackingInputs(rows: readonly TripTrackingInput[], startsAt: Date, endsAt: Date) {
  if (rows.length > 100) throw new TripTrackingValidationError("Too many tracking assignments.");
  const assets = new Set<string>();
  return rows.map((row) => {
    if (!row.assetId || assets.has(row.assetId)) {
      throw new TripTrackingValidationError("Choose each tracker only once.");
    }
    assets.add(row.assetId);
    if (!Object.hasOwn(tripTrackingRoles, row.role)) throw new TripTrackingValidationError("Invalid tracker role.");
    const assignedFrom = assignmentDate(row.assignedFrom);
    const assignedUntil = assignmentDate(row.assignedUntil);
    const from = assignedFrom ?? startsAt;
    const until = assignedUntil ?? endsAt;
    if (from > until) {
      throw new TripTrackingValidationError("Tracking assignment dates must be ordered.");
    }
    if ((row.notes?.length ?? 0) > 500) throw new TripTrackingValidationError("Tracking notes must be 500 characters or fewer.");
    const notes = row.notes?.replace(/<[^>]*>/g, "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim() || null;
    return { trackingAssetId: row.assetId, role: row.role, vehicleId: row.vehicleId || null,
      assignedFrom, assignedUntil, notes };
  });
}

// A missing marker preserves assignments (old/disabled forms); count zero removes all.
export function parseTripTrackingForm(form: FormData): TripTrackingInput[] | undefined {
  if (!form.has("trackingAssignmentCount")) return undefined;
  const rawCount = form.get("trackingAssignmentCount");
  if (typeof rawCount !== "string" || !/^\d+$/.test(rawCount) || Number(rawCount) > 100) {
    throw new TripTrackingValidationError("Invalid tracking assignment count.");
  }
  return Array.from({ length: Number(rawCount) }, (_, index) => {
    const value = (key: string) => {
      const field = form.get(`tracking[${index}][${key}]`);
      if (field !== null && typeof field !== "string") throw new TripTrackingValidationError("Invalid tracking field.");
      return field?.trim() || "";
    };
    return { assetId: value("assetId"), role: value("role") as TripTrackingRole,
      vehicleId: value("vehicleId") || null, assignedFrom: value("assignedFrom") || null,
      assignedUntil: value("assignedUntil") || null, notes: value("notes") || null };
  });
}
