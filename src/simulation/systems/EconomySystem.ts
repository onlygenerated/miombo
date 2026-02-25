import type { GameState } from '../GameState.js';
import type { Commodity, PriceTrend } from '../models/Economy.js';
import { ECONOMY } from '../../config.js';
import { randomFloat, randomChoice } from '../utils/random.js';

/**
 * Update market prices with random variation around base prices.
 * Trend shifts occur every TREND_SHIFT_INTERVAL turns.
 */
export function updateEconomy(state: GameState): GameState {
  const { turn } = state.calendar;
  const { trend } = state.economy;

  // Determine if trend shifts this turn
  let newTrend: PriceTrend = trend;
  if (turn > 0 && turn % ECONOMY.TREND_SHIFT_INTERVAL === 0) {
    const trends: PriceTrend[] = ['rising', 'stable', 'falling'];
    newTrend = randomChoice(state.rng, trends);
  }

  // Trend modifier applied on top of base prices
  const trendMod = newTrend === 'rising' ? 0.1 : newTrend === 'falling' ? -0.1 : 0;

  // Calculate new prices with variation
  const basePrices = ECONOMY.PRICES;
  const commodities = Object.keys(basePrices) as Commodity[];
  const newPrices = {} as Record<Commodity, number>;

  for (const commodity of commodities) {
    const base = basePrices[commodity];
    const variation = randomFloat(
      state.rng,
      -ECONOMY.PRICE_VARIATION,
      ECONOMY.PRICE_VARIATION,
    );
    const price = Math.max(1, Math.round(base * (1 + variation + trendMod)));
    newPrices[commodity] = price;
  }

  return {
    ...state,
    economy: {
      prices: newPrices,
      trend: newTrend,
    },
  };
}
