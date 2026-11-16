export type LngLat = {
  longitude: number;
  latitude: number;
};

export type HappengoMapProps = {
  center: LngLat;
  zoom?: number;
  styleUrl: string;
};
