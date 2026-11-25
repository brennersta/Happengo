export const REPORT_REASONS = [
  "inappropriate_content",
  "spam_scam",
  "fake_misleading",
  "harassment_unsafe",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];
