import type { NormalisedTrackingMessage, TrackingFreshness, TrackingMessageKind } from "./types";

const spotKinds: Readonly<Record<string, TrackingMessageKind>> = {
  TRACK: "TRACKING",
  "EXTREME-TRACK": "TRACKING",
  "UNLIMITED-TRACK": "TRACKING",
  OK: "CHECK_IN",
  NEWMOVEMENT: "MOVEMENT",
  HELP: "HELP",
  "HELP-CANCEL": "HELP_CANCEL",
  CUSTOM: "CUSTOM",
  POI: "POINT_OF_INTEREST",
  STOP: "STOP",
};

export function normaliseSpotMessageKind(type: string): TrackingMessageKind {
  return Object.hasOwn(spotKinds, type.trim().toUpperCase())
    ? spotKinds[type.trim().toUpperCase()]
    : "UNKNOWN";
}

export function validCoordinates(latitude: unknown, longitude: unknown): boolean {
  return typeof latitude === "number" && Number.isFinite(latitude) &&
    latitude >= -90 && latitude <= 90 &&
    typeof longitude === "number" && Number.isFinite(longitude) &&
    longitude >= -180 && longitude <= 180;
}

// Pure normalisation of a synthetic/provider event, without HTTP or raw payload storage.
export function normaliseSpotMessage(input: {
  externalMessageId: string;
  occurredAt: Date;
  providerMessageType: string;
  latitude?: unknown;
  longitude?: unknown;
}): NormalisedTrackingMessage {
  if (!input.externalMessageId.trim() || !Number.isFinite(input.occurredAt.getTime())) {
    throw new Error("Invalid tracking message identity or timestamp.");
  }
  const hasFix = validCoordinates(input.latitude, input.longitude);
  return {
    externalMessageId: input.externalMessageId,
    occurredAt: new Date(input.occurredAt),
    providerMessageType: input.providerMessageType,
    messageKind: normaliseSpotMessageKind(input.providerMessageType),
    latitude: hasFix ? input.latitude as number : null,
    longitude: hasFix ? input.longitude as number : null,
  };
}

export function trackingFreshness(
  positionAt: Date | null,
  expectedIntervalMinutes: number | null = null,
  now: Date = new Date(),
): TrackingFreshness {
  if (!positionAt || !Number.isFinite(positionAt.getTime())) return "NO_FIX";
  const interval = expectedIntervalMinutes !== null && Number.isFinite(expectedIntervalMinutes)
    ? Math.max(0, expectedIntervalMinutes) : 0;
  const ageMinutes = Math.max(0, (now.getTime() - positionAt.getTime()) / 60_000);
  if (ageMinutes <= Math.max(15, 2 * interval)) return "CURRENT";
  if (ageMinutes <= Math.max(60, 6 * interval)) return "AGING";
  return "STALE";
}
