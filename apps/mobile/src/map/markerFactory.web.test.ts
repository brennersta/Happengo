import { createWebMarker } from "./markerFactory.web";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { MapMarker } from "./types";

type FakeElement = {
  style: { cssText: string; boxShadow?: string };
  type?: string;
  title?: string;
  setAttribute: jest.Mock;
  addEventListener: jest.Mock;
  append: jest.Mock;
  animate: jest.Mock;
};

function createElement(): FakeElement {
  return {
    style: { cssText: "" },
    setAttribute: jest.fn(),
    addEventListener: jest.fn(),
    append: jest.fn(),
    animate: jest.fn(),
  };
}

test("web marker leaves positioning to MapLibre and anchors at the pin tip", () => {
  const elements: FakeElement[] = [];
  const documentRef = {
    createElement: jest.fn(() => {
      const element = createElement();
      elements.push(element);
      return element;
    }),
  } as unknown as Pick<Document, "createElement">;
  const markerInstance = {
    setLngLat: jest.fn().mockReturnThis(),
    setPopup: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
  };
  const Marker = jest.fn().mockImplementation(() => markerInstance);
  const Popup = jest.fn().mockImplementation(() => ({ setText: jest.fn().mockReturnThis() }));
  const maplibre = { Marker, Popup } as unknown as typeof import("maplibre-gl");
  const map = {} as MapLibreMap;
  const item: MapMarker = {
    id: "event-1",
    coordinate: { longitude: 24.75, latitude: 59.44 },
    title: "Open air concert",
    mainTag: "Music",
  };

  createWebMarker(maplibre, map, item, undefined, false, documentRef);

  const options = Marker.mock.calls[0]?.[0] as { element: FakeElement; anchor: string };
  expect(options.anchor).toBe("bottom");
  expect(options.element.style.cssText).not.toMatch(/(?:^|;)\s*(?:position|top|left|transform)\s*:/);
  expect(elements[1]?.style.cssText).toContain("position:relative");
  expect(elements[1]?.style.cssText).toContain("height:46px");
});
