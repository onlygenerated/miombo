import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../../src/simulation/GameState.js';
import { updateGrazing } from '../../../src/simulation/systems/GrazingSystem.js';
import { createTurnContext } from '../../../src/simulation/TurnContext.js';
import { GRAZING } from '../../../src/config.js';

function makeCtx() {
  return createTurnContext();
}

describe('GrazingSystem', () => {
  it('applies logistic growth to biomass', () => {
    const state = createInitialState(42);
    // Set up rainy season with good rainfall for visible growth
    const rainy = {
      ...state,
      calendar: { ...state.calendar, season: 'rainy' as const, rainfall: 0.8 },
      // Remove all cattle so only growth happens
      player: { ...state.player, livestock: { ...state.player.livestock, cattle: 0 } },
      neighbors: state.neighbors.map((n) => ({ ...n, cattle: 0 })),
    };
    const ctx = makeCtx();
    const result = updateGrazing(rainy, ctx);
    expect(result.communal.grazing.biomass).toBeGreaterThan(rainy.communal.grazing.biomass);
  });

  it('seasonal modifiers affect growth', () => {
    const base = createInitialState(42);
    const noCattle = {
      ...base,
      player: { ...base.player, livestock: { ...base.player.livestock, cattle: 0 } },
      neighbors: base.neighbors.map((n) => ({ ...n, cattle: 0 })),
    };

    const rainy = {
      ...noCattle,
      calendar: { ...noCattle.calendar, season: 'rainy' as const, rainfall: 0.8 },
    };
    const hotDry = {
      ...noCattle,
      calendar: { ...noCattle.calendar, season: 'hot-dry' as const, rainfall: 0.8 },
    };

    const rainyResult = updateGrazing(rainy, makeCtx());
    const hotDryResult = updateGrazing(hotDry, makeCtx());

    // Rainy season growth > hot-dry growth
    const rainyGrowth =
      rainyResult.communal.grazing.biomass - rainy.communal.grazing.biomass;
    const hotDryGrowth =
      hotDryResult.communal.grazing.biomass - hotDry.communal.grazing.biomass;
    expect(rainyGrowth).toBeGreaterThan(hotDryGrowth);
  });

  it('overgrazing degrades health', () => {
    const state = createInitialState(42);
    // Many cattle → heavy overgrazing
    const heavy = {
      ...state,
      calendar: { ...state.calendar, season: 'rainy' as const, rainfall: 0.5 },
      player: { ...state.player, livestock: { cattle: 50, health: 70 } },
      neighbors: state.neighbors.map((n) => ({ ...n, cattle: 50 })),
    };
    const ctx = makeCtx();
    const result = updateGrazing(heavy, ctx);
    expect(result.communal.grazing.health).toBeLessThan(heavy.communal.grazing.health);
  });

  it('sustainable grazing allows health recovery', () => {
    const state = createInitialState(42);
    // Few cattle, health below max
    const light = {
      ...state,
      communal: {
        ...state.communal,
        grazing: { ...state.communal.grazing, health: 50 },
      },
      calendar: { ...state.calendar, season: 'rainy' as const, rainfall: 0.5 },
      player: { ...state.player, livestock: { cattle: 1, health: 70 } },
      neighbors: state.neighbors.map((n) => ({ ...n, cattle: 0 })),
    };
    const ctx = makeCtx();
    const result = updateGrazing(light, ctx);
    expect(result.communal.grazing.health).toBeGreaterThan(light.communal.grazing.health);
  });

  it('tipping point triggers permanent capacity loss', () => {
    const state = createInitialState(42);
    const critical = {
      ...state,
      communal: {
        ...state.communal,
        grazing: {
          ...state.communal.grazing,
          health: 5, // Below TIPPING_POINT (10)
        },
      },
      calendar: { ...state.calendar, season: 'rainy' as const, rainfall: 0.5 },
      player: { ...state.player, livestock: { cattle: 0, health: 70 } },
      neighbors: state.neighbors.map((n) => ({ ...n, cattle: 0 })),
    };
    const ctx = makeCtx();
    const result = updateGrazing(critical, ctx);
    expect(result.communal.grazing.maxBiomass).toBeLessThan(
      critical.communal.grazing.maxBiomass,
    );
    expect(ctx.events.some((e) => e.includes('tipping point'))).toBe(true);
  });

  it('degradation levels track health thresholds', () => {
    const state = createInitialState(42);
    const noCattle = {
      ...state,
      calendar: { ...state.calendar, season: 'rainy' as const, rainfall: 0.5 },
      player: { ...state.player, livestock: { cattle: 0, health: 70 } },
      neighbors: state.neighbors.map((n) => ({ ...n, cattle: 0 })),
    };

    // Health 90 → degradation 0 (above all thresholds)
    const healthy = {
      ...noCattle,
      communal: { ...noCattle.communal, grazing: { ...noCattle.communal.grazing, health: 90 } },
    };
    expect(updateGrazing(healthy, makeCtx()).communal.grazing.degradationLevel).toBe(0);

    // Health 15 → degradation 4 (below 80, 60, 40, 20)
    const degraded = {
      ...noCattle,
      communal: { ...noCattle.communal, grazing: { ...noCattle.communal.grazing, health: 15 } },
    };
    expect(updateGrazing(degraded, makeCtx()).communal.grazing.degradationLevel).toBe(4);
  });

  it('zero cattle means only growth occurs', () => {
    const state = createInitialState(42);
    const noCattle = {
      ...state,
      calendar: { ...state.calendar, season: 'rainy' as const, rainfall: 0.8 },
      player: { ...state.player, livestock: { cattle: 0, health: 70 } },
      neighbors: state.neighbors.map((n) => ({ ...n, cattle: 0 })),
    };
    const ctx = makeCtx();
    const result = updateGrazing(noCattle, ctx);
    expect(result.communal.grazing.biomass).toBeGreaterThan(noCattle.communal.grazing.biomass);
  });

  it('biomass is clamped to [0, maxBiomass]', () => {
    const state = createInitialState(42);
    // Massive cattle should drain biomass to 0
    const massive = {
      ...state,
      calendar: { ...state.calendar, season: 'hot-dry' as const, rainfall: 0.1 },
      communal: {
        ...state.communal,
        grazing: { ...state.communal.grazing, biomass: 50, maxBiomass: 1000 },
      },
      player: { ...state.player, livestock: { cattle: 100, health: 70 } },
      neighbors: state.neighbors.map((n) => ({ ...n, cattle: 100 })),
    };
    const ctx = makeCtx();
    const result = updateGrazing(massive, ctx);
    expect(result.communal.grazing.biomass).toBeGreaterThanOrEqual(0);
  });

  it('populates totalCattleOnCommons in context', () => {
    const state = createInitialState(42);
    const ctx = makeCtx();
    updateGrazing(state, ctx);
    // Player(3) + Mubita(8) + Nasilele(4) + Inonge(1) = 16
    expect(ctx.totalCattleOnCommons).toBe(16);
  });
});
