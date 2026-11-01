import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { OperationsMap } from "../components/tracking/operations-map";
import { focusTrackingMarker, observeTrackingMapResize, reportTrackingMapFailure } from "../lib/tracking/map-client";
import { buildTrackingOperationsModel, trackingMessageLabel } from "../lib/tracking/presentation";
import type { TrackingAssetOverviewDTO } from "../lib/tracking/types";

const asset: TrackingAssetOverviewDTO = {
  assetId: "synthetic-browser-tracker", displayName: "Synthetic browser tracker",
  provider: "SPOT", providerDisplayName: null, model: "Synthetic",
  latitude: 0.12, longitude: -0.12, latestPositionAt: "2030-01-01T11:55:00Z",
  latestMessageAt: "2030-01-01T11:59:00Z", latestMessageKind: "HELP",
  freshness: "CURRENT", vehicle: null, trip: null,
};

test("map shell server-renders without a DOM or Leaflet runtime and retains Field Operations", () => {
  assert.equal(typeof window, "undefined");
  const html = renderToString(createElement(OperationsMap, {
    assets: [asset], snapshotAt: "2030-01-01T12:00:00Z", allowSyntheticBasemap: true,
  }));
  assert.match(html, /Field Operations/);
  assert.match(html, /Assistance requested/);
  assert.match(html, /Synthetic browser tracker/);
  assert.doesNotMatch(html, /leaflet-marker-icon/);
});

test("Leaflet has a client ssr:false boundary, a static renderer import, and one root stylesheet", () => {
  const shell = readFileSync(new URL("../components/tracking/operations-map.tsx", import.meta.url), "utf8");
  const renderer = readFileSync(new URL("../components/tracking/leaflet-operations-map.tsx", import.meta.url), "utf8");
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.ok(shell.startsWith('"use client";'));
  assert.match(shell, /import dynamic from "next\/dynamic"/);
  assert.match(shell, /import\("\.\/leaflet-operations-map"\)/);
  assert.match(shell, /ssr:\s*false/);
  assert.doesNotMatch(shell, /from "leaflet"|import\("leaflet"\)|leaflet\/dist\/leaflet.css/);
  assert.match(renderer, /import \* as L from "leaflet"/);
  assert.doesNotMatch(renderer, /import\("leaflet"\)|leaflet\/dist\/leaflet.css/);
  assert.equal(layout.split('import "leaflet/dist/leaflet.css";').length - 1, 1);
  assert.match(renderer, /instance\.remove\(\)/);
  assert.match(renderer, /marker\.on\("click", \(\) => onSelectAsset\(asset\.assetId\)\)/);
});

test("shell passes only valid marker models to the renderer, preserving no-fix assets and message language", () => {
  const noFix = { ...asset, assetId: "synthetic-no-fix", latitude: null, longitude: null, latestPositionAt: null, freshness: "NO_FIX" as const };
  const model = buildTrackingOperationsModel([asset, noFix]);
  assert.deepEqual(model.markers.map((marker) => marker.assetId), [asset.assetId]);
  assert.equal(model.assets.length, 2);
  assert.equal(trackingMessageLabel("HELP"), "Assistance requested");
  const shell = readFileSync(new URL("../components/tracking/operations-map.tsx", import.meta.url), "utf8");
  assert.match(shell, /<LeafletOperationsMap assets=\{model\.markers\}/);
  assert.match(shell, /selectedId=\{selectedId\}/);
  assert.match(shell, /onSelectAsset=\{selectAsset\}/);
});

test("selection focuses and opens the exact marker ID, including repeated selection and no-fix selection", () => {
  const calls: unknown[] = [];
  const marker = (id: string) => ({
    getLatLng: () => id,
    openPopup: () => { calls.push(["popup", id]); },
    getElement: () => ({ classList: { toggle: (name: string, selected: boolean) => { calls.push([id, name, selected]); } } }),
  });
  const markers = new Map([["a", marker("a")], ["b", marker("b")]]);
  const map = { panTo: (position: string) => { calls.push(["pan", position]); }, closePopup: () => { calls.push("close"); } };
  focusTrackingMarker(map, markers, "b");
  assert.deepEqual(calls, [["a", "tracking-marker-selected", false], ["b", "tracking-marker-selected", true], ["pan", "b"], ["popup", "b"]]);
  calls.length = 0;
  focusTrackingMarker(map, markers, "b");
  assert.deepEqual(calls.slice(-2), [["pan", "b"], ["popup", "b"]]);
  calls.length = 0;
  focusTrackingMarker(map, markers, "synthetic-no-fix");
  assert.equal(calls.at(-1), "close");
  assert.equal(calls.some((call) => Array.isArray(call) && call[0] === "pan"), false);
});

test("ResizeObserver is optional and observer cleanup disconnects the existing instance", () => {
  const element = {} as HTMLElement;
  assert.doesNotThrow(() => observeTrackingMapResize(element, () => { throw new Error("Must not be called"); }, undefined)());
  let resize: (() => void) | undefined;
  let observed: HTMLElement | undefined;
  let disconnected = false;
  let updates = 0;
  class Observer {
    constructor(callback: () => void) { resize = callback; }
    observe(target: HTMLElement) { observed = target; }
    disconnect() { disconnected = true; }
  }
  const stop = observeTrackingMapResize(element, () => { updates++; }, Observer as unknown as typeof ResizeObserver);
  assert.equal(observed, element);
  resize!();
  assert.equal(updates, 1);
  stop();
  assert.equal(disconnected, true);
});

test("component, constructor and tile failures emit distinct safe diagnostics without raw error content", () => {
  const messages: string[] = [];
  const originalError = console.error;
  const originalWarn = console.warn;
  console.error = (...args) => { messages.push(`error:${args.join(" ")}`); };
  console.warn = (...args) => { messages.push(`warn:${args.join(" ")}`); };
  try {
    const error = new TypeError("synthetic-private-error-canary");
    reportTrackingMapFailure("component-load", error);
    reportTrackingMapFailure("map-constructor", error);
    reportTrackingMapFailure("tile-layer", error);
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
  }
  assert.match(messages[0], /^error:.*LEAFLET_COMPONENT_LOAD_FAILED \(TypeError\)/);
  assert.match(messages[1], /^error:.*LEAFLET_MAP_CONSTRUCTOR_FAILED \(TypeError\)/);
  assert.match(messages[2], /^warn:.*LEAFLET_TILE_LAYER_FAILED \(TypeError\)/);
  assert.doesNotMatch(messages.join(" "), /synthetic-private-error-canary|https?:|credential|payload/);
  const renderer = readFileSync(new URL("../components/tracking/leaflet-operations-map.tsx", import.meta.url), "utf8");
  const tileHandling = renderer.slice(renderer.indexOf("    if (allowSyntheticBasemap)"), renderer.indexOf("    try {\n      stopObserving"));
  assert.match(tileHandling, /failTiles\(\)/);
  assert.doesNotMatch(tileHandling, /failMap|setMapFailed/);
});
