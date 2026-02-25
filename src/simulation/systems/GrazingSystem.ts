import type { GameState } from '../GameState.js';
import type { TurnContext } from '../TurnContext.js';
import { GRAZING } from '../../config.js';
import { clamp } from '../utils/clamp.js';

/**
 * Grazing commons system — the educational core of Miombo.
 *
 * Models logistic grass growth, seasonal variation, overgrazing pressure,
 * health degradation/recovery, and the tipping point mechanic that makes
 * the tragedy of the commons tangible.
 *
 * Player cattle are always on commons by default (subsistence farmers).
 */
export function updateGrazing(state: GameState, ctx: TurnContext): GameState {
  const g = state.communal.grazing;
  const { season, rainfall } = state.calendar;

  // ── Total cattle on commons ──
  const playerCattle = state.player.livestock.cattle;
  const neighborCattle = state.neighbors.reduce((sum, n) => sum + n.cattle, 0);
  const totalCattle = playerCattle + neighborCattle;
  ctx.totalCattleOnCommons = totalCattle;

  // ── Logistic grass growth ──
  const seasonalMod = GRAZING.SEASONAL_GROWTH_MODIFIER[season];
  const growth =
    GRAZING.LOGISTIC_GROWTH_RATE *
    g.biomass *
    (1 - g.biomass / g.maxBiomass) *
    seasonalMod *
    rainfall;

  // ── Consumption ──
  const consumption = totalCattle * GRAZING.CONSUMPTION_PER_CATTLE;

  // ── New biomass ──
  const newBiomass = clamp(g.biomass + growth - consumption, 0, g.maxBiomass);

  // ── Overgrazing intensity ──
  const sustainableConsumption = g.maxBiomass * GRAZING.SUSTAINABLE_RATE;
  const overgrazeIntensity =
    consumption > sustainableConsumption
      ? (consumption - sustainableConsumption) / sustainableConsumption
      : 0;

  // ── Health degrades under overgrazing, recovers otherwise ──
  let newHealth = g.health;
  if (overgrazeIntensity > 0) {
    newHealth -= GRAZING.HEALTH_DEGRADE_RATE * overgrazeIntensity;
  } else {
    newHealth += GRAZING.HEALTH_RECOVERY_RATE;
  }
  newHealth = clamp(newHealth, 0, 100);

  // ── Tipping point: permanent capacity loss ──
  let newMaxBiomass = g.maxBiomass;
  if (newHealth < GRAZING.TIPPING_POINT) {
    newMaxBiomass = g.maxBiomass * (1 - GRAZING.CAPACITY_LOSS_RATE);
    ctx.events.push('Grazing land has crossed a tipping point — permanent capacity loss!');
  }

  // ── Degradation level ──
  const degradationLevel = Math.min(
    GRAZING.DEGRADATION_THRESHOLDS.filter((t) => newHealth < t).length,
    4,
  );

  return {
    ...state,
    communal: {
      ...state.communal,
      grazing: {
        health: newHealth,
        biomass: newBiomass,
        maxBiomass: newMaxBiomass,
        degradationLevel,
      },
    },
  };
}
