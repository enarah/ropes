import { validCoordinates } from "./domain";
import type { TrackingAssetOverviewDTO, TrackingFreshness, TrackingMessageKind } from "./types";

export const trackingMessageLabels: Readonly<Record<TrackingMessageKind, string>> = {
  TRACKING: "Tracking update",
  CHECK_IN: "Check-in",
  MOVEMENT: "Movement detected",
  HELP: "Assistance requested",
  HELP_CANCEL: "Assistance request cancelled",
  CUSTOM: "Custom message",
  POINT_OF_INTEREST: "Point of interest",
  STOP: "Tracking stopped",
  UNKNOWN: "Unknown tracker message",
};
export const freshnessLabels: Readonly<Record<TrackingFreshness, string>> = {
  CURRENT: "Current", AGING: "Aging", STALE: "Stale", NO_FIX: "No fix",
};
export function trackingMessageLabel(kind: TrackingMessageKind | null) {
  return kind ? trackingMessageLabels[kind] : "No messages received";
}
export function trackingAttentionPriority(asset: TrackingAssetOverviewDTO) {
  if (asset.latestMessageKind === "HELP") return 0;
  return { NO_FIX: 1, STALE: 2, AGING: 3, CURRENT: 4 }[asset.freshness];
}
export function buildTrackingOperationsModel(assets: readonly TrackingAssetOverviewDTO[]) {
  const sorted = [...assets].sort((a, b) => trackingAttentionPriority(a) - trackingAttentionPriority(b) ||
    (b.latestMessageAt ? Date.parse(b.latestMessageAt) : 0) - (a.latestMessageAt ? Date.parse(a.latestMessageAt) : 0) ||
    a.displayName.localeCompare(b.displayName) || a.assetId.localeCompare(b.assetId));
  return {
    assets: sorted,
    markers: sorted.filter((asset) => validCoordinates(asset.latitude, asset.longitude)),
    counts: {
      assets: sorted.length,
      current: sorted.filter((asset) => asset.freshness === "CURRENT").length,
      attentionRequired: sorted.filter((asset) => trackingAttentionPriority(asset) < 4).length,
      activeTripLinked: sorted.filter((asset) => asset.trip?.status === "IN_PROGRESS").length,
    },
  };
}
export function trackingTimestamp(value: string | null, snapshotAt: string) {
  if (!value) return { exact: "No timestamp", relative: "" };
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return { exact: "No timestamp", relative: "" };
  const minutes = Math.max(0, Math.floor((Date.parse(snapshotAt) - date.getTime()) / 60_000));
  const relative = minutes < 1 ? "less than a minute ago" : minutes < 60 ? `${minutes} min ago` :
    minutes < 1440 ? `${Math.floor(minutes / 60)} hr ${minutes % 60} min ago` : `${Math.floor(minutes / 1440)} days ago`;
  return { exact: date.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC"), relative };
}
