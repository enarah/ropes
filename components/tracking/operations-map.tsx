"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { syntheticSandboxBasemap } from "@/lib/tracking/basemap";
import { buildTrackingOperationsModel, freshnessLabels, trackingMessageLabel, trackingTimestamp } from "@/lib/tracking/presentation";
import type { TrackingAssetOverviewDTO } from "@/lib/tracking/types";

function Timestamp({ value, snapshotAt }: { value: string | null; snapshotAt: string }) {
  if (!value) return <span>No valid position recorded</span>;
  const { exact, relative } = trackingTimestamp(value, snapshotAt);
  return <span><time dateTime={value}>{exact}</time><span className="block text-xs text-charcoal-600">{relative}</span></span>;
}

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

export function OperationsMap({ assets, snapshotAt, allowSyntheticBasemap }: {
  assets: TrackingAssetOverviewDTO[];
  snapshotAt: string;
  allowSyntheticBasemap: boolean;
}) {
  const model = useMemo(() => buildTrackingOperationsModel(assets), [assets]);
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const markers = useRef(new Map<string, Marker>());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [basemapFailed, setBasemapFailed] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [mapVersion, setMapVersion] = useState(0);

  useEffect(() => {
    const element = container.current;
    if (!element || model.markers.length === 0) return;
    let disposed = false;
    let instance: LeafletMap | null = null;
    let observer: ResizeObserver | undefined;
    const assetMarkers = new Map<string, Marker>();
    void import("leaflet").then((L) => {
      if (disposed) return;
      instance = L.map(element, { scrollWheelZoom: false, maxZoom: 18 });
      map.current = instance;
      if (allowSyntheticBasemap) {
        L.tileLayer(syntheticSandboxBasemap.url, {
          attribution: syntheticSandboxBasemap.attribution,
          maxZoom: syntheticSandboxBasemap.maxZoom,
          referrerPolicy: "strict-origin-when-cross-origin",
        }).on("tileerror", () => { if (!disposed) setBasemapFailed(true); }).addTo(instance);
      }
      for (const asset of model.markers) {
        const attention = asset.latestMessageKind === "HELP";
        const marker = L.marker([asset.latitude!, asset.longitude!], {
          icon: L.divIcon({
            className: `tracking-marker tracking-marker-${attention ? "help" : asset.freshness.toLowerCase()}`,
            html: `<span aria-hidden="true">${attention ? "!" : "●"}</span>`,
            iconSize: [30, 30], iconAnchor: [15, 15],
          }),
          title: `Select ${asset.displayName}`,
          alt: asset.displayName,
          keyboard: true,
        }).addTo(instance).bindPopup(popupContent(asset, snapshotAt), { maxWidth: 310 });
        marker.getElement()?.setAttribute("aria-label", `Select ${asset.displayName}`);
        marker.on("click", () => setSelectedId(asset.assetId));
        assetMarkers.set(asset.assetId, marker);
      }
      markers.current = assetMarkers;
      instance.fitBounds(L.latLngBounds(model.markers.map((asset) => [asset.latitude!, asset.longitude!])), {
        padding: [35, 35], maxZoom: model.markers.length === 1 ? 9 : 10,
      });
      observer = new ResizeObserver(() => instance?.invalidateSize({ pan: false }));
      observer.observe(element);
      setMapVersion((version) => version + 1);
    }).catch(() => { if (!disposed) setMapFailed(true); });
    return () => {
      disposed = true;
      observer?.disconnect();
      instance?.remove();
      map.current = null;
      markers.current.clear();
    };
  }, [model.markers, snapshotAt, allowSyntheticBasemap]);

  useEffect(() => {
    for (const [id, marker] of markers.current) marker.getElement()?.classList.toggle("tracking-marker-selected", id === selectedId);
    const marker = selectedId ? markers.current.get(selectedId) : undefined;
    if (marker) {
      map.current?.panTo(marker.getLatLng(), { animate: false });
      marker.openPopup();
    } else {
      map.current?.closePopup();
    }
  }, [selectedId, mapVersion]);

  function selectAsset(assetId: string) {
    setSelectedId(assetId);
    const marker = markers.current.get(assetId);
    if (marker) {
      map.current?.panTo(marker.getLatLng(), { animate: false });
      marker.openPopup();
    }
  }

  return (
    <section aria-labelledby="operations-map-heading" className="rounded-md border border-earth-200 bg-white shadow-sm">
      <div className="border-b border-earth-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ochre-700">Organisation tracking</p>
            <h2 id="operations-map-heading" className="mt-1 text-xl font-semibold text-charcoal-950">Operations Map</h2>
            <p className="mt-2 text-sm text-charcoal-600">Last known positions, with source timestamps. Refresh the page to update this snapshot.</p>
          </div>
          {allowSyntheticBasemap ? <span className="rounded-md border border-ochre-200 bg-ochre-50 px-3 py-1 text-xs font-semibold text-ochre-800">Synthetic sandbox data</span> : null}
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[["Assets", model.counts.assets], ["Current", model.counts.current], ["Attention required", model.counts.attentionRequired], ["Active trip-linked assets", model.counts.activeTripLinked]].map(([label, count]) => (
            <div key={label} className="rounded-md bg-earth-50 px-4 py-3">
              <dt className="text-xs font-medium text-charcoal-600">{label}</dt>
              <dd className="mt-1 text-2xl font-semibold text-charcoal-950">{count}</dd>
            </div>
          ))}
        </dl>
      </div>
      {assets.length === 0 ? (
        <p className="p-8 text-sm text-charcoal-700">No tracking assets have been configured for this organisation.</p>
      ) : (
        <div className="grid lg:grid-cols-[2fr_1fr]">
          <div className="min-w-0 space-y-3 p-4">
            <div className="relative z-0 overflow-hidden rounded-md border border-earth-200 bg-earth-50">
              <div ref={container} role="region" aria-label="Organisation tracker positions map. The Field Operations list provides the same details." className="h-[360px] w-full sm:h-[480px]" />
              {model.markers.length === 0 || mapFailed ? (
                <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-sm text-charcoal-700">
                  {mapFailed ? "The map could not load. Tracker details remain available in Field Operations." : "No valid positions to show. All trackers are listed in Field Operations."}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-charcoal-700" aria-label="Map freshness legend">
              {Object.entries(freshnessLabels).map(([state, label]) => <span className="inline-flex items-center gap-1.5" key={state}><span aria-hidden="true" className={`tracking-legend tracking-marker-${state.toLowerCase()}`} />{label}</span>)}
              <span className="font-semibold text-red-800">! Assistance requested</span>
            </div>
            {basemapFailed ? <p role="status" className="rounded-md bg-ochre-50 p-3 text-sm text-ochre-800">Basemap tiles are unavailable. Position markers and Field Operations remain usable.</p> : null}
            {!allowSyntheticBasemap ? <p className="text-xs text-charcoal-600">No basemap is configured for this environment. Position markers and Field Operations remain available.</p> : null}
            <p className="text-xs leading-5 text-charcoal-600">Snapshot: <time dateTime={snapshotAt}>{trackingTimestamp(snapshotAt, snapshotAt).exact}</time>. Freshness describes the last valid position; a later message may have no coordinates.</p>
          </div>
          <aside aria-labelledby="field-operations-heading" className="min-w-0 border-t border-earth-200 bg-earth-50 p-4 lg:border-l lg:border-t-0">
            <h3 id="field-operations-heading" className="text-lg font-semibold text-charcoal-950">Field Operations</h3>
            <p className="mt-1 text-xs leading-5 text-charcoal-600">Attention first. Select a tracker to focus its last known position.</p>
            <ul className="mt-4 space-y-3 lg:max-h-[570px] lg:overflow-y-auto lg:pr-1">
              {model.assets.map((asset) => {
                const selected = asset.assetId === selectedId;
                return (
                  <li key={asset.assetId} className={`rounded-md border bg-white p-3 ${selected ? "border-ochre-600 ring-2 ring-ochre-200" : "border-earth-200"}`}>
                    <button type="button" aria-pressed={selected} onClick={() => selectAsset(asset.assetId)} className="flex w-full flex-wrap items-start justify-between gap-2 rounded text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ochre-700">
                      <span className="text-sm font-semibold text-charcoal-950">{asset.displayName}{selected ? <span className="mt-1 block text-xs text-ochre-800">Selected</span> : null}</span>
                      <span className="rounded bg-earth-100 px-2 py-1 text-xs font-semibold text-charcoal-800">{freshnessLabels[asset.freshness]}</span>
                    </button>
                    <p className="mt-2 text-xs text-charcoal-600">{[asset.provider, asset.model].filter(Boolean).join(" · ")}</p>
                    <p className={`mt-2 text-sm font-semibold ${asset.latestMessageKind === "HELP" ? "rounded bg-red-50 p-2 text-red-800" : "text-charcoal-800"}`}>
                      {asset.latestMessageKind === "HELP" ? "! " : ""}{trackingMessageLabel(asset.latestMessageKind)}
                    </p>
                    <dl className="mt-3 space-y-2 text-xs leading-5 text-charcoal-700">
                      <div><dt className="font-semibold">Vehicle</dt><dd>{asset.vehicle ? `${asset.vehicle.name} · ${asset.vehicle.registration}` : "No vehicle assigned"}</dd></div>
                      <div><dt className="font-semibold">Trip</dt><dd>{asset.trip ? `${asset.trip.title} · ${asset.trip.role.toLowerCase()} · ${asset.trip.status.toLowerCase().replaceAll("_", " ")}` : "No current/planned trip"}</dd></div>
                      <div><dt className="font-semibold">Last valid position</dt><dd><Timestamp value={asset.latestPositionAt} snapshotAt={snapshotAt} /></dd></div>
                      <div><dt className="font-semibold">Latest message</dt><dd>{asset.latestMessageAt ? <Timestamp value={asset.latestMessageAt} snapshotAt={snapshotAt} /> : "No messages received"}</dd></div>
                    </dl>
                    {asset.latitude === null || asset.longitude === null ? <p className="mt-2 text-xs text-charcoal-600">No valid position to focus on the map.</p> : null}
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      )}
    </section>
  );
}
