export type LngLat = {
  longitude: number;
  latitude: number;
};

export type MapBounds = { southWest: LngLat; northEast: LngLat };
export type MapMarker = {
  id: string;
  coordinate: LngLat;
  title: string;
  mainTag?: string | null;
  tagLabel?: string | null;
  happeningNow?: boolean;
  kind?: "event" | "incident";
  incidentCategory?: "fire" | "traffic_collision" | "other";
};

export type MapFocus = { longitude: number; latitude: number; key: number };

export type HappengoMapProps = {
  center: LngLat;
  zoom?: number;
  styleUrl: string;
  markers?: MapMarker[];
  focus?: MapFocus | null;
  onMarkerPress?: (id: string) => void;
  onMapIdle?: (bounds: MapBounds, zoom: number) => void;
  onMapPress?: (coordinate: LngLat) => void;
};
