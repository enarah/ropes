import assert from "node:assert/strict";
import test from "node:test";
import { normaliseSpotMessage, normaliseSpotMessageKind, trackingFreshness, validCoordinates } from "../lib/tracking/domain";

test("SPOT-like types normalise to provider-neutral kinds, including unknown events", () => {
  const cases = {
    TRACK: "TRACKING", "EXTREME-TRACK": "TRACKING", "UNLIMITED-TRACK": "TRACKING",
    OK: "CHECK_IN", NEWMOVEMENT: "MOVEMENT", HELP: "HELP", "HELP-CANCEL": "HELP_CANCEL",
    CUSTOM: "CUSTOM", POI: "POINT_OF_INTEREST", STOP: "STOP", FUTURE: "UNKNOWN",
    constructor: "UNKNOWN", ["__proto__"]: "UNKNOWN",
  };
  for (const [source, expected] of Object.entries(cases)) assert.equal(normaliseSpotMessageKind(source), expected);
  assert.equal(normaliseSpotMessageKind(" ok "), "CHECK_IN");
});

test("invalid coordinates do not discard HELP-CANCEL; unknown provider type is retained", () => {
  for (const [latitude, longitude] of [[91, 0], [0, 181], [NaN, 1], [0, Infinity], [null, 0], ["0", "0"]]) {
    const message = normaliseSpotMessage({ externalMessageId: "synthetic-cancel", occurredAt: new Date(0),
      providerMessageType: "HELP-CANCEL", latitude, longitude });
    assert.equal(message.messageKind, "HELP_CANCEL");
    assert.equal(message.latitude, null);
    assert.equal(message.longitude, null);
  }
  assert.equal(validCoordinates(0, 0), true);
  assert.equal(validCoordinates(-90, 180), true);
  assert.equal(normaliseSpotMessage({ externalMessageId: "synthetic-unknown", occurredAt: new Date(0),
    providerMessageType: "SYNTHETIC-FUTURE" }).providerMessageType, "SYNTHETIC-FUTURE");
  assert.throws(() => normaliseSpotMessage({ externalMessageId: "", occurredAt: new Date(0), providerMessageType: "OK" }));
  assert.throws(() => normaliseSpotMessage({ externalMessageId: "synthetic-invalid", occurredAt: new Date(NaN), providerMessageType: "OK" }));
});

test("freshness uses inclusive defaults and expected interval thresholds with an injected clock", () => {
  const now = new Date("2030-01-01T12:00:00Z");
  const at = (minutes: number) => new Date(now.getTime() - minutes * 60_000);
  assert.equal(trackingFreshness(null, null, now), "NO_FIX");
  assert.equal(trackingFreshness(new Date(NaN), null, now), "NO_FIX");
  for (const interval of [null, 0, -1, NaN, 5]) {
    assert.equal(trackingFreshness(at(15), interval, now), "CURRENT");
    assert.equal(trackingFreshness(at(15.001), interval, now), "AGING");
    assert.equal(trackingFreshness(at(60), interval, now), "AGING");
    assert.equal(trackingFreshness(at(60.001), interval, now), "STALE");
  }
  assert.equal(trackingFreshness(at(40), 20, now), "CURRENT");
  assert.equal(trackingFreshness(at(40.001), 20, now), "AGING");
  assert.equal(trackingFreshness(at(120), 20, now), "AGING");
  assert.equal(trackingFreshness(at(120.001), 20, now), "STALE");
  assert.equal(trackingFreshness(at(-1), null, now), "CURRENT");
});
