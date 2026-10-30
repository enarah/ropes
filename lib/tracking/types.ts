// Client-safe, provider-neutral contracts. No Prisma records or provider configuration.
export type TrackingProvider = "SPOT";
export type TrackingAssetStatus = "ACTIVE" | "INACTIVE" | "RETIRED";
export type TrackingMessageKind =
  | "TRACKING" | "CHECK_IN" | "MOVEMENT" | "HELP" | "HELP_CANCEL"
  | "CUSTOM" | "POINT_OF_INTEREST" | "STOP" | "UNKNOWN";
export type TripTrackingRole = "PRIMARY" | "SUPPORT" | "PERSON" | "OTHER";
export type TrackingFreshness = "CURRENT" | "AGING" | "STALE" | "NO_FIX";

export type NormalisedTrackingMessage = {
  externalMessageId: string;
  occurredAt: Date;
  messageKind: TrackingMessageKind;
  providerMessageType: string;
  latitude: number | null;
  longitude: number | null;
};

export type TrackingVehicleDTO = { id: string; name: string; registration: string };
export type TrackingTripDTO = {
  id: string;
  title: string;
  status: string;
  startsAt: string;
  endsAt: string;
  role: TripTrackingRole;
};
export type TrackingAssetOverviewDTO = {
  assetId: string;
  displayName: string;
  provider: TrackingProvider;
  providerDisplayName: string | null;
  model: string | null;
  latitude: number | null;
  longitude: number | null;
  latestPositionAt: string | null;
  latestMessageAt: string | null;
  latestMessageKind: TrackingMessageKind | null;
  vehicle: TrackingVehicleDTO | null;
  trip: TrackingTripDTO | null;
  freshness: TrackingFreshness;
};
