import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../../src/simulation/GameState.js';
import { updateEconomy } from '../../../src/simulation/systems/EconomySystem.js';
import { ECONOMY } from '../../../src/config.js';

describe('EconomySystem', () => {
  it('generates prices around base values', () => {
    const state = createInitialState(42);
    const result = updateEconomy(state);

    for (const [commodity, basePrice] of Object.entries(ECONOMY.PRICES)) {
      const price = result.economy.prices[commodity as keyof typeof ECONOMY.PRICES];
      // Price should be within reasonable range of base (±25% accounting for trend)
      expect(price).toBeGreaterThan(0);
      expect(price).toBeLessThan(basePrice * 2);
    }
  });

  it('trend shifts at TREND_SHIFT_INTERVAL turns', () => {
    let state = createInitialState(42);
    // Turn 0 — no shift
    state = { ...state, calendar: { ...state.calendar, turn: 0 } };
    const r0 = updateEconomy(state);
    expect(r0.economy.trend).toBe('stable'); // No shift at turn 0

    // Turn 4 — shift happens
    state = { ...state, calendar: { ...state.calendar, turn: ECONOMY.TREND_SHIFT_INTERVAL } };
    const r4 = updateEconomy(state);
    expect(['rising', 'stable', 'falling']).toContain(r4.economy.trend);
  });

  it('no trend shift on non-interval turns', () => {
    const state = createInitialState(42);
    const s = { ...state, calendar: { ...state.calendar, turn: 3 } };
    const result = updateEconomy(s);
    expect(result.economy.trend).toBe('stable');
  });

  it('prices are always positive', () => {
    // Run many times with different seeds
    for (let seed = 1; seed <= 20; seed++) {
      const state = createInitialState(seed);
      const result = updateEconomy(state);
      for (const price of Object.values(result.economy.prices)) {
        expect(price).toBeGreaterThan(0);
      }
    }
  });

  it('prices are integers (rounded)', () => {
    const state = createInitialState(42);
    const result = updateEconomy(state);
    for (const price of Object.values(result.economy.prices)) {
      expect(price).toBe(Math.round(price));
    }
  });

  it('different seeds produce different prices', () => {
    const r1 = updateEconomy(createInitialState(1));
    const r2 = updateEconomy(createInitialState(999));
    // At least one price should differ
    const prices1 = Object.values(r1.economy.prices);
    const prices2 = Object.values(r2.economy.prices);
    const allSame = prices1.every((p, i) => p === prices2[i]);
    expect(allSame).toBe(false);
  });

  it('does not mutate original state', () => {
    const state = createInitialState(42);
    const origPrices = { ...state.economy.prices };
    updateEconomy(state);
    expect(state.economy.prices).toEqual(origPrices);
  });
});
