import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildTrackingOperationsModel, freshnessLabels, trackingMessageLabel, trackingMessageLabels, trackingTimestamp } from "../lib/tracking/presentation";
import { loadTrackingDashboardData } from "../lib/tracking/dashboard";
import type { TrackingAssetOverviewDTO } from "../lib/tracking/types";

const base: TrackingAssetOverviewDTO = {
  assetId: "synthetic-base", displayName: "Synthetic tracker", provider: "SPOT", providerDisplayName: null, model: null,
  latitude: 0.1, longitude: -0.1, latestPositionAt: "2030-01-01T11:55:00Z",
  latestMessageAt: "2030-01-01T11:55:00Z", latestMessageKind: "TRACKING",
  vehicle: null, trip: null, freshness: "CURRENT",
};

test("provider-neutral message language distinguishes assistance and cancellation without dispatch claims", () => {
  assert.equal(trackingMessageLabel("HELP"), "Assistance requested");
  assert.equal(trackingMessageLabel("HELP_CANCEL"), "Assistance request cancelled");
  assert.equal(trackingMessageLabel("CHECK_IN"), "Check-in");
  assert.equal(trackingMessageLabel(null), "No messages received");
  for (const label of Object.values(trackingMessageLabels)) assert.doesNotMatch(label, /\bSOS\b|dispatch|rescue|emergency/i);
  for (const label of Object.values(freshnessLabels)) assert.doesNotMatch(label, /offline|missing|emergency/i);
  const helperSource = readFileSync(new URL("../lib/tracking/presentation.ts", import.meta.url), "utf8");
  assert.doesNotMatch(helperSource, /\bSOS\b|emergency dispatch|rescue initiated/i);
});

test("attention order is HELP, NO_FIX, STALE, AGING, CURRENT; ties use newest event", () => {
  const assets: TrackingAssetOverviewDTO[] = [
    { ...base, assetId: "current" },
    { ...base, assetId: "aging", freshness: "AGING" },
    { ...base, assetId: "stale", freshness: "STALE" },
    { ...base, assetId: "no-fix", freshness: "NO_FIX", latitude: null, longitude: null, latestPositionAt: null },
    { ...base, assetId: "help-older", latestMessageKind: "HELP", latestMessageAt: "2030-01-01T11:00:00Z" },
    { ...base, assetId: "help-newer", latestMessageKind: "HELP", latestMessageAt: "2030-01-01T11:59:00Z" },
  ];
  const model = buildTrackingOperationsModel(assets);
  assert.deepEqual(model.assets.map((asset) => asset.assetId), ["help-newer", "help-older", "no-fix", "stale", "aging", "current"]);
  assert.equal(model.markers.length, 5);
  assert.equal(model.assets.find((asset) => asset.assetId === "no-fix")?.freshness, "NO_FIX");
  assert.deepEqual(model.counts, { assets: 6, current: 3, attentionRequired: 5, activeTripLinked: 0 });
  assert.equal(assets[0].assetId, "current", "sorting must not mutate DTO input");
  assert.equal(buildTrackingOperationsModel([{ ...base, latitude: 91 }]).markers.length, 0);
});

test("empty tracking model is safe and timestamp presentation uses the fixed snapshot", () => {
  assert.deepEqual(buildTrackingOperationsModel([]), { assets: [], markers: [], counts: {
    assets: 0, current: 0, attentionRequired: 0, activeTripLinked: 0,
  } });
  assert.equal(trackingTimestamp(base.latestPositionAt, "2030-01-01T12:00:00Z").relative, "5 min ago");
  assert.equal(trackingTimestamp(base.latestPositionAt, "2030-01-01T12:00:00Z").exact, "2030-01-01 11:55:00 UTC");
  assert.equal(trackingTimestamp("2030-01-01T11:55:00.123Z", "2030-01-01T12:00:00Z").exact, "2030-01-01 11:55:00 UTC");
});

test("disabled capability and missing database tenant ID never request tracking data", async () => {
  let calls = 0;
  const reader = async () => { calls++; return [base]; };
  const organisation = { id: "synthetic-org", slug: "synthetic-org", name: "Synthetic", region: "Synthetic", type: "Demo" };
  assert.deepEqual(await loadTrackingDashboardData({ ...organisation, capabilityKeys: [] }, reader), { status: "hidden" });
  assert.equal(calls, 0);
  assert.deepEqual(await loadTrackingDashboardData({ ...organisation, id: undefined, capabilityKeys: ["integrations.spotTracker"] }, reader), { status: "unavailable" });
  assert.equal(calls, 0);
  assert.deepEqual(await loadTrackingDashboardData({ ...organisation, capabilityKeys: ["integrations.spotTracker"] }, async () => { throw new Error("synthetic-private-diagnostic"); }), { status: "unavailable" });
});
