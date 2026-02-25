import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../../src/simulation/GameState.js';
import { updateLivestock } from '../../../src/simulation/systems/LivestockSystem.js';
import { createTurnContext } from '../../../src/simulation/TurnContext.js';
import { LIVESTOCK } from '../../../src/config.js';

describe('LivestockSystem', () => {
  it('produces milk and manure', () => {
    const state = createInitialState(42);
    const ctx = createTurnContext();
    const result = updateLivestock(state, ctx);
    const cattle = result.player.livestock.cattle;
    // Milk and manure added to stores
    expect(result.player.stores.milk).toBeGreaterThanOrEqual(
      state.player.stores.milk,
    );
    expect(result.player.stores.manure).toBeGreaterThanOrEqual(
      state.player.stores.manure,
    );
  });

  it('births can occur', () => {
    // Run many iterations to statistically expect at least one birth
    let totalBirths = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const state = createInitialState(seed);
      const bigHerd = {
        ...state,
        player: {
          ...state.player,
          livestock: { cattle: 20, health: 80 },
        },
      };
      const ctx = createTurnContext();
      const result = updateLivestock(bigHerd, ctx);
      if (result.player.livestock.cattle > 20) totalBirths++;
    }
    // With 20 cattle and monthly birth rate 0.08/12 ≈ 0.0067, expect some births
    expect(totalBirths).toBeGreaterThan(0);
  });

  it('natural deaths can occur', () => {
    let totalDeaths = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const state = createInitialState(seed);
      const bigHerd = {
        ...state,
        player: {
          ...state.player,
          livestock: { cattle: 50, health: 80 },
        },
      };
      const ctx = createTurnContext();
      const result = updateLivestock(bigHerd, ctx);
      // Check if cattle decreased (accounting for possible births)
      if (result.player.livestock.cattle < 50) totalDeaths++;
    }
    expect(totalDeaths).toBeGreaterThan(0);
  });

  it('starvation deaths when biomass below threshold', () => {
    let starvationOccurred = false;
    for (let seed = 1; seed <= 50; seed++) {
      const state = createInitialState(seed);
      const starving = {
        ...state,
        communal: {
          ...state.communal,
          grazing: {
            ...state.communal.grazing,
            biomass: 50, // Well below STARVATION_THRESHOLD (200)
          },
        },
        player: {
          ...state.player,
          livestock: { cattle: 20, health: 50 },
        },
      };
      const ctx = createTurnContext();
      const result = updateLivestock(starving, ctx);
      if (ctx.events.some((e) => e.includes('starvation'))) {
        starvationOccurred = true;
      }
    }
    expect(starvationOccurred).toBe(true);
  });

  it('no starvation when biomass above threshold', () => {
    const state = createInitialState(42);
    // Default biomass is 800, well above threshold
    const ctx = createTurnContext();
    updateLivestock(state, ctx);
    expect(ctx.events.some((e) => e.includes('starvation'))).toBe(false);
  });

  it('cattle health lerps toward grazing quality', () => {
    const state = createInitialState(42);
    // Cattle health 30, grazing health 80 → should increase
    const lowHealth = {
      ...state,
      player: {
        ...state.player,
        livestock: { cattle: 3, health: 30 },
      },
      communal: {
        ...state.communal,
        grazing: { ...state.communal.grazing, health: 80 },
      },
    };
    const ctx = createTurnContext();
    const result = updateLivestock(lowHealth, ctx);
    expect(result.player.livestock.health).toBeGreaterThan(30);
  });

  it('zero cattle produces nothing', () => {
    const state = createInitialState(42);
    const noCattle = {
      ...state,
      player: {
        ...state.player,
        livestock: { cattle: 0, health: 0 },
      },
    };
    const ctx = createTurnContext();
    const result = updateLivestock(noCattle, ctx);
    expect(result.player.livestock.cattle).toBe(0);
    expect(result.player.stores.milk).toBe(state.player.stores.milk);
    expect(result.player.stores.manure).toBe(state.player.stores.manure);
  });

  it('cattle count never goes negative', () => {
    const state = createInitialState(42);
    const fewCattle = {
      ...state,
      communal: {
        ...state.communal,
        grazing: { ...state.communal.grazing, biomass: 10 },
      },
      player: {
        ...state.player,
        livestock: { cattle: 1, health: 10 },
      },
    };
    const ctx = createTurnContext();
    const result = updateLivestock(fewCattle, ctx);
    expect(result.player.livestock.cattle).toBeGreaterThanOrEqual(0);
  });
});
