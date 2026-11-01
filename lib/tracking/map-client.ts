// Browser map lifecycle helpers. No Leaflet runtime, tracking queries or raw errors.
export const trackingMapUnavailableMessage = "The map could not load. Tracker details remain available in Field Operations.";

export type TrackingMapFailureStage = "component-load" | "map-constructor" | "map-setup" | "tile-layer" | "resize-observer";
const failureCodes: Record<TrackingMapFailureStage, string> = {
  "component-load": "LEAFLET_COMPONENT_LOAD_FAILED",
  "map-constructor": "LEAFLET_MAP_CONSTRUCTOR_FAILED",
  "map-setup": "LEAFLET_MAP_SETUP_FAILED",
  "tile-layer": "LEAFLET_TILE_LAYER_FAILED",
  "resize-observer": "LEAFLET_RESIZE_OBSERVER_FAILED",
};

export function reportTrackingMapFailure(stage: TrackingMapFailureStage, error?: unknown) {
  // Fixed codes and built-in error categories only. Never log error.message,
  // stack, URLs, events, component props, DTOs or provider payloads.
  const category = error instanceof TypeError ? "TypeError" : error instanceof ReferenceError ? "ReferenceError" :
    error instanceof RangeError ? "RangeError" : "Error";
  const diagnostic = `[ROPES tracking map] ${failureCodes[stage]} (${category})`;
  if (stage === "tile-layer" || stage === "resize-observer") console.warn(diagnostic);
  else console.error(diagnostic);
}

export function observeTrackingMapResize(
  element: HTMLElement,
  onResize: () => void,
  Observer: typeof ResizeObserver | undefined = typeof ResizeObserver === "undefined" ? undefined : ResizeObserver,
) {
  if (!Observer) return () => {};
  const observer = new Observer(onResize);
  observer.observe(element);
  return () => observer.disconnect();
}

export function focusTrackingMarker<Position>(
  map: { panTo(position: Position, options: { animate: boolean }): unknown; closePopup(): unknown },
  markers: ReadonlyMap<string, {
    getLatLng(): Position;
    openPopup(): unknown;
    getElement(): { classList: { toggle(name: string, force: boolean): unknown } } | undefined;
  }>,
  selectedId: string | null,
) {
  for (const [id, marker] of markers) marker.getElement()?.classList.toggle("tracking-marker-selected", id === selectedId);
  const marker = selectedId ? markers.get(selectedId) : undefined;
  if (!marker) {
    map.closePopup();
    return;
  }
  map.panTo(marker.getLatLng(), { animate: false });
  marker.openPopup();
}
