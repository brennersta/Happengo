import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
import type { HappengoMapProps, MapMarker } from "./types";
import { centeredAuraPosition, INCIDENT_MARKER_COLOR, incidentMarkerSymbol, LIVE_AURA_SIZE, liveAuraMode, MARKER_PIN_SIZE, markerColor } from "./markerStyle";

type MapLibreModule = typeof import("maplibre-gl");

const popupOffset = 16;
const markerWidth = 36;
const markerHeight = 46;
const pinLeft = 5;
const rotatedTipInset = 18.3848;

export function createWebMarker(
  maplibre: MapLibreModule,
  map: MapLibreMap,
  item: MapMarker,
  onMarkerPress: HappengoMapProps["onMarkerPress"],
  reduceMotion: boolean,
  documentRef: Pick<Document, "createElement"> = document,
): MapLibreMarker {
  const element = documentRef.createElement("button");
  element.type = "button";
  const tag = item.tagLabel || item.mainTag;
  element.setAttribute("aria-label", `${item.title}${tag ? `, ${tag}` : ""}${item.happeningNow ? ", happening now" : ""}`);
  element.title = item.title;
  element.addEventListener("click", () => onMarkerPress?.(item.id));
  element.style.cssText = `width:${markerWidth}px;height:${markerHeight}px;padding:0;border:0;background:transparent;cursor:pointer;`;

  const wrapper = documentRef.createElement("span");
  wrapper.style.cssText = `display:block;position:relative;width:${markerWidth}px;height:${markerHeight}px;`;
  const aura = documentRef.createElement("span");
  const pinTop = markerHeight - rotatedTipInset - MARKER_PIN_SIZE / 2;
  const auraPosition = centeredAuraPosition(pinLeft, pinTop);
  aura.style.cssText = `position:absolute;left:${auraPosition.left}px;top:${auraPosition.top}px;width:${LIVE_AURA_SIZE}px;height:${LIVE_AURA_SIZE}px;border-radius:50%;pointer-events:none;`;
  const pin = documentRef.createElement("span");
  pin.style.cssText = `position:absolute;left:${pinLeft}px;top:${pinTop}px;width:${MARKER_PIN_SIZE}px;height:${MARKER_PIN_SIZE}px;box-sizing:border-box;background:${item.kind === "incident" ? INCIDENT_MARKER_COLOR : markerColor(item.mainTag)};border:2px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.28);pointer-events:none;`;
  if (item.kind === "incident") {
    const symbol = documentRef.createElement("span");
    symbol.textContent = incidentMarkerSymbol(item.incidentCategory);
    symbol.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;transform:rotate(45deg);font-size:12px;color:white;";
    pin.append(symbol);
  }
  wrapper.append(aura, pin);
  element.append(wrapper);

  if (liveAuraMode(item.happeningNow, reduceMotion) === "pulse") {
    aura.animate(
      [{ boxShadow: "0 0 0 0 rgba(24,168,121,.45)" }, { boxShadow: "0 0 0 12px rgba(24,168,121,0)" }],
      { duration: 1600, iterations: Infinity },
    );
  } else if (item.happeningNow) {
    aura.style.boxShadow = "0 0 0 4px rgba(24,168,121,.35)";
  }

  return new maplibre.Marker({ element, anchor: "bottom" })
    .setLngLat([item.coordinate.longitude, item.coordinate.latitude])
    .setPopup(new maplibre.Popup({ offset: popupOffset }).setText(item.title))
    .addTo(map);
}
