export const EVENT_TAGS = ["Music", "Sports", "Food", "Art", "Family", "Tech", "Nightlife", "Outdoor", "Culture", "Education"] as const;
export type EventTag = (typeof EVENT_TAGS)[number];

export const EVENT_TAG_COLORS: Record<EventTag, string> = {
  Music: "#7c3aed", Sports: "#0284c7", Food: "#ea580c", Art: "#db2777", Family: "#16a34a",
  Tech: "#4f46e5", Nightlife: "#9333ea", Outdoor: "#15803d", Culture: "#b45309", Education: "#0f766e",
};

export const NEUTRAL_MARKER_COLOR = "#5b5bd6";

export function markerColor(tag?: string | null): string {
  return tag && tag in EVENT_TAG_COLORS ? EVENT_TAG_COLORS[tag as EventTag] : NEUTRAL_MARKER_COLOR;
}

export type LiveAuraMode = "none" | "static" | "pulse";

/** A live pin pulses unless the platform asks for reduced motion, which keeps a static ring. */
export function liveAuraMode(happeningNow: boolean | undefined, prefersReducedMotion: boolean): LiveAuraMode {
  if (!happeningNow) return "none";
  return prefersReducedMotion ? "static" : "pulse";
}
