import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../../src/simulation/GameState.js';
import {
  updateWoodland,
  getRegenRate,
} from '../../../src/simulation/systems/WoodlandSystem.js';
import { createTurnContext } from '../../../src/simulation/TurnContext.js';
import { WOODLAND } from '../../../src/config.js';

describe('WoodlandSystem', () => {
  describe('getRegenRate', () => {
    it('HIGH band (density > 60)', () => {
      expect(getRegenRate(70)).toBe(WOODLAND.REGEN_RATES.HIGH);
      expect(getRegenRate(100)).toBe(WOODLAND.REGEN_RATES.HIGH);
    });

    it('MID band (density 20-60)', () => {
      expect(getRegenRate(40)).toBe(WOODLAND.REGEN_RATES.MID);
      expect(getRegenRate(21)).toBe(WOODLAND.REGEN_RATES.MID);
    });

    it('LOW band (density 5-20)', () => {
      expect(getRegenRate(10)).toBe(WOODLAND.REGEN_RATES.LOW);
      expect(getRegenRate(6)).toBe(WOODLAND.REGEN_RATES.LOW);
    });

    it('CRITICAL band (density < 5)', () => {
      expect(getRegenRate(4)).toBe(WOODLAND.REGEN_RATES.CRITICAL);
      expect(getRegenRate(0)).toBe(WOODLAND.REGEN_RATES.CRITICAL);
    });

    it('boundary values use correct band', () => {
      expect(getRegenRate(60)).toBe(WOODLAND.REGEN_RATES.MID); // 60 is NOT > 60
      expect(getRegenRate(20)).toBe(WOODLAND.REGEN_RATES.LOW); // 20 is NOT > 20
      expect(getRegenRate(5)).toBe(WOODLAND.REGEN_RATES.CRITICAL);  // 5 is NOT > 5
    });
  });

  it('density regenerates without extraction', () => {
    const state = createInitialState(42);
    const ctx = createTurnContext();
    // No extraction happened
    const result = updateWoodland(state, ctx);
    // Initial density 70 → HIGH band regen = 0.1 * 70 = 7.0
    expect(result.communal.woodland.density).toBeGreaterThan(state.communal.woodland.density);
  });

  it('charcoal extraction is 2.5x firewood', () => {
    expect(WOODLAND.CHARCOAL_EXTRACTION).toBe(2.5 * WOODLAND.FIREWOOD_EXTRACTION);
  });

  it('extraction reduces density', () => {
    const state = createInitialState(42);
    const ctx = createTurnContext();
    // Simulate heavy extraction by neighbors
    ctx.totalWoodExtracted = 5;
    ctx.totalCharcoalProduced = 10;
    const result = updateWoodland(state, ctx);
    // Regen = 0.1 * 70 = 7. Extraction = 15. Net = -8
    expect(result.communal.woodland.density).toBeLessThan(state.communal.woodland.density);
  });

  it('density clamped to [0, 100]', () => {
    const state = createInitialState(42);
    // Low density + massive extraction → should clamp to 0
    const low = {
      ...state,
      communal: {
        ...state.communal,
        woodland: { ...state.communal.woodland, density: 2 },
      },
    };
    const ctx = createTurnContext();
    ctx.totalWoodExtracted = 50;
    const result = updateWoodland(low, ctx);
    expect(result.communal.woodland.density).toBe(0);

    // High density + lots of regen → should clamp to 100
    const high = {
      ...state,
      communal: {
        ...state.communal,
        woodland: { ...state.communal.woodland, density: 99 },
      },
    };
    const ctx2 = createTurnContext();
    const result2 = updateWoodland(high, ctx2);
    expect(result2.communal.woodland.density).toBeLessThanOrEqual(100);
  });

  it('derived values scale with density', () => {
    const state = createInitialState(42);
    const ctx = createTurnContext();
    const result = updateWoodland(state, ctx);
    const d = result.communal.woodland.density;
    expect(result.communal.woodland.ecosystemServices).toBeCloseTo(
      d * WOODLAND.ECOSYSTEM_SERVICES_FACTOR,
    );
    expect(result.communal.woodland.veldProducts).toBeCloseTo(d * 0.5);
  });

  it('neighbor extraction is applied', () => {
    const state = createInitialState(42);
    const ctx = createTurnContext();
    ctx.neighborActions = [
      {
        neighborId: 'mubita',
        grazed: false,
        woodExtracted: 3,
        charcoalProduced: 0,
        violated: false,
      },
    ];
    // Note: neighborExtraction in WoodlandSystem reads from ctx.totalWoodExtracted
    // which should be accumulated from neighbor actions
    // The NeighborAISystem populates ctx.totalWoodExtracted; for direct testing
    // we set it manually
    ctx.totalWoodExtracted = 3;
    const result = updateWoodland(state, ctx);
    // Regen = 0.1 * 70 = 7. Extraction = 3. Net = +4
    expect(result.communal.woodland.density).toBeLessThan(
      state.communal.woodland.density + 7,
    );
  });

  it('preserves hectares', () => {
    const state = createInitialState(42);
    const ctx = createTurnContext();
    const result = updateWoodland(state, ctx);
    expect(result.communal.woodland.hectares).toBe(state.communal.woodland.hectares);
  });
});
