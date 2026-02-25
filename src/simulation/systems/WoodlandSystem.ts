import type { GameState } from '../GameState.js';
import type { TurnContext } from '../TurnContext.js';
import { WOODLAND } from '../../config.js';
import { clamp } from '../utils/clamp.js';

/**
 * Woodland regeneration and extraction.
 *
 * Regen rate varies by density band — coppicing (mid) is fastest,
 * critical densities barely recover. Charcoal extraction is 2.5x
 * more destructive than firewood.
 */
export function updateWoodland(state: GameState, ctx: TurnContext): GameState {
  const w = state.communal.woodland;

  // ── Determine regen rate by density band ──
  const regenRate = getRegenRate(w.density);

  // ── Regeneration (density growth per turn) ──
  const regen = regenRate * w.density;

  // ── Total extraction from neighbors (player extraction already applied in ActionResolver) ──
  const neighborExtraction = ctx.totalWoodExtracted + ctx.totalCharcoalProduced;

  // ── New density ──
  const newDensity = clamp(w.density + regen - neighborExtraction, 0, 100);

  // ── Derived values ──
  const ecosystemServices = newDensity * WOODLAND.ECOSYSTEM_SERVICES_FACTOR;
  const veldProducts = newDensity * 0.5;

  return {
    ...state,
    communal: {
      ...state.communal,
      woodland: {
        ...w,
        density: newDensity,
        regenerationRate: regenRate,
        ecosystemServices,
        veldProducts,
      },
    },
  };
}

/** Select regeneration rate based on current density band. */
export function getRegenRate(density: number): number {
  if (density > WOODLAND.DENSITY_BANDS.HIGH) return WOODLAND.REGEN_RATES.HIGH;
  if (density > WOODLAND.DENSITY_BANDS.MID) return WOODLAND.REGEN_RATES.MID;
  if (density > WOODLAND.DENSITY_BANDS.CRITICAL) return WOODLAND.REGEN_RATES.LOW;
  return WOODLAND.REGEN_RATES.CRITICAL;
}
