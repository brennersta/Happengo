import type { ViewStyle } from "react-native";

export const theme = {
  gradient: ["#4F46E5", "#9333EA"] as const,
  brand: "#4F46E5",
  brandInk: "#3C3489",
  page: "#F4F2FB",
  ink: "#1F1B2E",
  muted: "#6B6780",
  line: "#E6E3F0",
  card: "#FFFFFF",
  chip: "#F4F2FA",
  chipText: "#4C4766",
  live: "#12805C",
  liveBg: "#E5F7EF",
  danger: "#A33333",
  shadow: {
    shadowColor: "#1F1B2E",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  } satisfies ViewStyle,
};

export const wideLayoutWidth = 960;
