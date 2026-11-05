"use client";

// This module is reachable only through next/dynamic({ ssr: false }). Static
// import gives the bundler one consistent Leaflet namespace in the browser.
import * as L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { syntheticSandboxBasemap } from "@/lib/tracking/basemap";
import { focusTrackingMarker, trackingPopupLayout, observeTrackingMapResize, reportTrackingMapFailure, trackingMapUnavailableMessage } from "@/lib/tracking/map-client";
import { freshnessLabels, trackingMessageLabel, trackingTimestamp } from "@/lib/tracking/presentation";
import type { TrackingAssetOverviewDTO } from "@/lib/tracking/types";
// Leaflet accepts DOM nodes. Use textContent for all names and other data rather
// than building HTML from tracker/provider text.
function popupContent(asset: TrackingAssetOverviewDTO, snapshotAt: string) {
  const content = document.createElement("div");
  content.className = "tracking-popup";
  const heading = document.createElement("strong");
  heading.textContent = asset.displayName;
  content.append(heading);
  const rows = [
    ["Device", [asset.provider, asset.providerDisplayName, asset.model].filter(Boolean).join(" · ")],
    ["Vehicle", asset.vehicle ? `${asset.vehicle.name} (${asset.vehicle.registration})` : "No vehicle assigned"],
    ["Trip", asset.trip ? `${asset.trip.title} · ${asset.trip.role.toLowerCase()} · ${asset.trip.status.toLowerCase().replaceAll("_", " ")}` : "No current/planned trip"],
    ["Position", asset.latestPositionAt ? Object.values(trackingTimestamp(asset.latestPositionAt, snapshotAt)).join(" · ") : "No valid position recorded"],
    ["Message", trackingMessageLabel(asset.latestMessageKind)],
    ["Message time", asset.latestMessageAt ? Object.values(trackingTimestamp(asset.latestMessageAt, snapshotAt)).join(" · ") : "No messages received"],
    ["Freshness", freshnessLabels[asset.freshness]],
  ];
  for (const [label, value] of rows) {
    const row = document.createElement("p");
    const title = document.createElement("b");
    title.textContent = `${label}: `;
    row.append(title, document.createTextNode(value));
    content.append(row);
  }
  return content;
}

export function LeafletOperationsMap({ assets, snapshotAt, allowSyntheticBasemap, selectedId, focusRequest, onSelectAsset }: {
  assets: TrackingAssetOverviewDTO[];
  snapshotAt: string;
  allowSyntheticBasemap: boolean;
  selectedId: string | null;
  focusRequest: number;
  onSelectAsset: (assetId: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const [mapFailed, setMapFailed] = useState(false);
  const [basemapFailed, setBasemapFailed] = useState(false);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let instance: L.Map;
    let stopObserving = () => {};
    let disposed = false;
    queueMicrotask(() => {
      if (!disposed) { setMapFailed(false); setBasemapFailed(false); }
    });
    const failMap = () => queueMicrotask(() => { if (!disposed) setMapFailed(true); });
    const failTiles = () => queueMicrotask(() => { if (!disposed) setBasemapFailed(true); });
    try {
      instance = L.map(element, { scrollWheelZoom: false, maxZoom: 18 });
    } catch (error) {
      reportTrackingMapFailure("map-constructor", error);
      failMap();
      return () => { disposed = true; };
    }
    map.current = instance;
    const assetMarkers = new Map<string, L.Marker>();
    markers.current = assetMarkers;
    const resizePopups = () => {
      for (const marker of assetMarkers.values()) {
        const popup = marker.getPopup();
        if (!popup) continue;
        Object.assign(popup.options, trackingPopupLayout(instance.getSize()));
        if (popup.isOpen()) popup.update();
      }
    };
    instance.on("resize", resizePopups);
    const cleanup = () => {
      disposed = true;
      stopObserving();
      instance.off("resize", resizePopups);
      instance.remove();
      if (map.current === instance) map.current = null;
      assetMarkers.clear();
    };
    try {
      for (const asset of assets) {
        const attention = asset.latestMessageKind === "HELP";
        const marker = L.marker([asset.latitude!, asset.longitude!], {
          icon: L.divIcon({
            className: `tracking-marker tracking-marker-${attention ? "help" : asset.freshness.toLowerCase()}`,
            html: `<span aria-hidden="true">${attention ? "!" : "●"}</span>`,
            iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -15],
          }),
          title: `Select ${asset.displayName}`, alt: asset.displayName, keyboard: true,
        }).addTo(instance).bindPopup(popupContent(asset, snapshotAt), {
          ...trackingPopupLayout(instance.getSize()), className: "tracking-map-popup",
          offset: [0, 0],
        });
        marker.getElement()?.setAttribute("aria-label", `Select ${asset.displayName}`);
        marker.on("click", () => onSelectAsset(asset.assetId));
        assetMarkers.set(asset.assetId, marker);
      }
      instance.fitBounds(L.latLngBounds(assets.map((asset) => [asset.latitude!, asset.longitude!])), {
        padding: [35, 35], maxZoom: assets.length === 1 ? 9 : 10,
      });
    } catch (error) {
      reportTrackingMapFailure("map-setup", error);
      failMap();
      // Dispose the partial map on the normal effect cleanup too.
      return cleanup;
    }
    if (allowSyntheticBasemap) {
      let tileFailureReported = false;
      const tileFailure = () => {
        if (disposed) return;
        if (!tileFailureReported) reportTrackingMapFailure("tile-layer");
        tileFailureReported = true;
        failTiles();
      };
      try {
        L.tileLayer(syntheticSandboxBasemap.url, {
          attribution: syntheticSandboxBasemap.attribution, maxZoom: syntheticSandboxBasemap.maxZoom,
          referrerPolicy: "strict-origin-when-cross-origin",
        }).on("tileerror", tileFailure).addTo(instance);
      } catch {
        tileFailure();
      }
    }
    try {
      stopObserving = observeTrackingMapResize(element, () => { if (!disposed) instance.invalidateSize({ pan: false }); });
    } catch (error) {
      // Resize observation is optional; markers and map controls remain usable.
      reportTrackingMapFailure("resize-observer", error);
    }
    return cleanup;
  }, [assets, snapshotAt, allowSyntheticBasemap, onSelectAsset]);

  useEffect(() => {
    if (map.current) focusTrackingMarker(map.current, markers.current, selectedId);
  }, [selectedId, focusRequest, assets, snapshotAt, allowSyntheticBasemap, onSelectAsset]);

  return (
    <div>
      <div className="relative">
        <div ref={container} role="region" aria-label="Organisation tracker positions map. The Field Operations list provides the same details." className="h-[360px] w-full sm:h-[480px]" />
        {mapFailed ? <div role="status" className="absolute inset-0 z-[1000] flex items-center justify-center bg-earth-50 p-8 text-center text-sm text-charcoal-700">{trackingMapUnavailableMessage}</div> : null}
      </div>
      {basemapFailed ? <p role="status" className="m-3 rounded-md bg-ochre-50 p-3 text-sm text-ochre-800">Basemap tiles are unavailable. Position markers and Field Operations remain usable.</p> : null}
    </div>
  );
}
