// ─── Health → Color Ramp ─────────────────────────────────────────────
export const HEALTH_COLORS = {
  EXCELLENT: 0x4CAF50, // 80-100 green
  GOOD: 0x8BC34A,      // 60-79  light green
  FAIR: 0xFFC107,      // 40-59  amber
  POOR: 0xA0522D,      // 20-39  brown
  CRITICAL: 0x9E9E9E,  // 0-19   grey
} as const;

// ─── Zone Colors ─────────────────────────────────────────────────────
export const ZONE_COLORS = {
  CROP_FIELD: 0x8B6914,
  GRAZING: 0x228B22,
  WOODLAND: 0x006400,
  SETTLEMENT: 0xD2B48C,
} as const;

// ─── UI Theme ────────────────────────────────────────────────────────
export const UI_COLORS = {
  BG_DARK: 0x1a1a2e,
  BG_GREEN: 0x2d5016,
  PANEL: 0x1e3a0f,
  BUTTON: 0x4a7c2e,
  BUTTON_PRESSED: 0x3a5c20,
  BUTTON_DISABLED: 0x555555,
  TEXT: 0xffffff,
  TEXT_DIM: 0xaaaaaa,
  HIGHLIGHT: 0xFFD700,
  DANGER: 0xFF4444,
  BORDER: 0x6b8e3e,
  OVERLAY: 0x000000,
} as const;

// ─── Action Category Colors ──────────────────────────────────────────
export const CATEGORY_COLORS: Record<string, number> = {
  farm: 0x8B6914,
  livestock: 0x6B4226,
  woodland: 0x2E7D32,
  market: 0x1565C0,
  governance: 0x6A1B9A,
  hwc: 0xE65100,
  rest: 0x37474F,
};
