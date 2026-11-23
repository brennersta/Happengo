export type LngLat = {
  longitude: number;
  latitude: number;
};

export type MapBounds = { southWest: LngLat; northEast: LngLat };
export type MapMarker = { id: string; coordinate: LngLat; title: string; mainTag?: string | null; happeningNow?: boolean };

export type HappengoMapProps = {
  center: LngLat;
  zoom?: number;
  styleUrl: string;
  markers?: MapMarker[];
  onMarkerPress?: (id: string) => void;
  onMapIdle?: (bounds: MapBounds) => void;
  onMapPress?: (coordinate: LngLat) => void;
};
