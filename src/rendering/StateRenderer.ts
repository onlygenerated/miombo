import { HEALTH_COLORS, ZONE_COLORS } from './colors.js';
import { I18n } from '../i18n/I18n.js';
import type { GameState } from '../simulation/GameState.js';

// ─── Health / Density → Color ────────────────────────────────────────

export function healthToColor(health: number): number {
  if (health >= 80) return HEALTH_COLORS.EXCELLENT;
  if (health >= 60) return HEALTH_COLORS.GOOD;
  if (health >= 40) return HEALTH_COLORS.FAIR;
  if (health >= 20) return HEALTH_COLORS.POOR;
  return HEALTH_COLORS.CRITICAL;
}

export function densityToColor(density: number): number {
  return healthToColor(density);
}

// ─── Formatting ──────────────────────────────────────────────────────

export function formatMoney(kwacha: number): string {
  return `K${kwacha.toLocaleString()}`;
}

const MONTH_KEYS = [
  '', 'month.1', 'month.2', 'month.3', 'month.4', 'month.5', 'month.6',
  'month.7', 'month.8', 'month.9', 'month.10', 'month.11', 'month.12',
];

export function formatMonth(month: number): string {
  return I18n.t(MONTH_KEYS[month] || 'month.1');
}

const SEASON_KEYS: Record<string, string> = {
  'hot-dry': 'season.hot-dry',
  'rainy': 'season.rainy',
  'cool-dry': 'season.cool-dry',
};

export function formatSeason(season: string): string {
  return I18n.t(SEASON_KEYS[season] || season);
}

// ─── Tile Map Helpers ────────────────────────────────────────────────

export type ZoneType = 'crop' | 'grazing' | 'woodland' | 'settlement';

export function zoneBaseColor(zone: ZoneType): number {
  switch (zone) {
    case 'crop': return ZONE_COLORS.CROP_FIELD;
    case 'grazing': return ZONE_COLORS.GRAZING;
    case 'woodland': return ZONE_COLORS.WOODLAND;
    case 'settlement': return ZONE_COLORS.SETTLEMENT;
  }
}

/** Get the tint color for a zone tile based on current game state health. */
export function zoneTint(zone: ZoneType, state: GameState): number {
  switch (zone) {
    case 'grazing': return healthToColor(state.communal.grazing.health);
    case 'woodland': return densityToColor(state.communal.woodland.density);
    case 'crop': {
      const avgHealth = state.player.fields.length > 0
        ? state.player.fields.reduce((s, f) => s + f.health, 0) / state.player.fields.length
        : 50;
      return healthToColor(avgHealth);
    }
    case 'settlement': return ZONE_COLORS.SETTLEMENT;
  }
}

/**
 * Build a zone layout for an 8×10 grid (80 tiles).
 * Returns array of ZoneType indexed by tile position (row-major).
 * Layout based on zonation percentages.
 */
export function buildZoneLayout(state: GameState): ZoneType[] {
  const z = state.communal.zonation;
  const total = z.cropFields + z.communalGrazing + z.woodlandReserve + z.settlement;
  const tileCount = 80;

  const woodlandTiles = Math.round((z.woodlandReserve / total) * tileCount);
  const grazingTiles = Math.round((z.communalGrazing / total) * tileCount);
  const cropTiles = Math.round((z.cropFields / total) * tileCount);
  const settlementTiles = tileCount - woodlandTiles - grazingTiles - cropTiles;

  const layout: ZoneType[] = [];
  // Top rows: woodland
  for (let i = 0; i < woodlandTiles; i++) layout.push('woodland');
  // Middle rows: grazing
  for (let i = 0; i < grazingTiles; i++) layout.push('grazing');
  // Lower rows: crop fields
  for (let i = 0; i < cropTiles; i++) layout.push('crop');
  // Bottom rows: settlement
  for (let i = 0; i < settlementTiles; i++) layout.push('settlement');

  return layout;
}
