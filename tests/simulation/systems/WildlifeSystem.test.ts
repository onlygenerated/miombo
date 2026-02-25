import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../../src/simulation/GameState.js';
import { updateWildlife } from '../../../src/simulation/systems/WildlifeSystem.js';
import { createTurnContext } from '../../../src/simulation/TurnContext.js';
import { WILDLIFE } from '../../../src/config.js';

describe('WildlifeSystem', () => {
  it('presence tracks woodland density', () => {
    const state = createInitialState(42);
    const ctx = createTurnContext();
    const result = updateWildlife(state, ctx);
    const expectedPresence =
      state.communal.woodland.density * WILDLIFE.PRESENCE_WOODLAND_FACTOR;
    expect(result.communal.wildlife.presence).toBeCloseTo(expectedPresence);
  });

  it('higher woodland → higher presence (conservation paradox)', () => {
    const state = createInitialState(42);
    const highWoodland = {
      ...state,
      communal: {
        ...state.communal,
        woodland: { ...state.communal.woodland, density: 90 },
      },
    };
    const lowWoodland = {
      ...state,
      communal: {
        ...state.communal,
        woodland: { ...state.communal.woodland, density: 20 },
      },
    };

    const ctxHigh = createTurnContext();
    const ctxLow = createTurnContext();
    const resultHigh = updateWildlife(highWoodland, ctxHigh);
    const resultLow = updateWildlife(lowWoodland, ctxLow);

    expect(resultHigh.communal.wildlife.presence).toBeGreaterThan(
      resultLow.communal.wildlife.presence,
    );
  });

  it('chilli fence reduces crop raid chance', () => {
    // Statistical test: compare HWC events across many seeds
    let raidsWithFence = 0;
    let raidsWithoutFence = 0;
    const trials = 200;

    for (let seed = 1; seed <= trials; seed++) {
      const base = createInitialState(seed);
      const growingFields = {
        ...base,
        communal: {
          ...base.communal,
          woodland: { ...base.communal.woodland, density: 90 },
        },
        player: {
          ...base.player,
          fields: base.player.fields.map((f) => ({
            ...f,
            stage: 'growing' as const,
            health: 80,
          })),
        },
      };

      // Without fence
      const noFence = { ...growingFields };
      const ctx1 = createTurnContext();
      updateWildlife(noFence, ctx1);
      if (ctx1.events.some((e) => e.includes('raided'))) raidsWithoutFence++;

      // With fence (new RNG from same seed, so reset)
      const withFence = {
        ...createInitialState(seed),
        communal: growingFields.communal,
        player: {
          ...growingFields.player,
          hwcMitigation: { ...growingFields.player.hwcMitigation, chilliFence: true },
        },
      };
      const ctx2 = createTurnContext();
      updateWildlife(withFence, ctx2);
      if (ctx2.events.some((e) => e.includes('raided'))) raidsWithFence++;
    }

    // Fence should reduce raids (allow some variance)
    expect(raidsWithFence).toBeLessThanOrEqual(raidsWithoutFence);
  });

  it('night kraal reduces predation', () => {
    let lossesWithKraal = 0;
    let lossesWithoutKraal = 0;
    const trials = 200;

    for (let seed = 1; seed <= trials; seed++) {
      const base = createInitialState(seed);
      const highWildlife = {
        ...base,
        communal: {
          ...base.communal,
          woodland: { ...base.communal.woodland, density: 90 },
        },
        player: {
          ...base.player,
          livestock: { cattle: 10, health: 70 },
        },
      };

      const noKraal = { ...highWildlife };
      const ctx1 = createTurnContext();
      updateWildlife(noKraal, ctx1);
      if (ctx1.events.some((e) => e.includes('predator'))) lossesWithoutKraal++;

      const withKraal = {
        ...createInitialState(seed),
        communal: highWildlife.communal,
        player: {
          ...highWildlife.player,
          hwcMitigation: { ...highWildlife.player.hwcMitigation, nightKraal: true },
        },
      };
      const ctx2 = createTurnContext();
      updateWildlife(withKraal, ctx2);
      if (ctx2.events.some((e) => e.includes('predator'))) lossesWithKraal++;
    }

    expect(lossesWithKraal).toBeLessThanOrEqual(lossesWithoutKraal);
  });

  it('low woodland means low HWC', () => {
    const state = createInitialState(42);
    const barren = {
      ...state,
      communal: {
        ...state.communal,
        woodland: { ...state.communal.woodland, density: 1 },
      },
    };
    const ctx = createTurnContext();
    const result = updateWildlife(barren, ctx);
    // Presence should be very low
    expect(result.communal.wildlife.presence).toBeLessThan(2);
  });

  it('cattle count never goes negative after predation', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const state = createInitialState(seed);
      const highRisk = {
        ...state,
        communal: {
          ...state.communal,
          woodland: { ...state.communal.woodland, density: 100 },
        },
        player: {
          ...state.player,
          livestock: { cattle: 2, health: 70 },
        },
      };
      const ctx = createTurnContext();
      const result = updateWildlife(highRisk, ctx);
      expect(result.player.livestock.cattle).toBeGreaterThanOrEqual(0);
    }
  });

  it('hwcPressure increases after events', () => {
    // Force an event by using high wildlife presence
    let foundIncrease = false;
    for (let seed = 1; seed <= 100; seed++) {
      const state = createInitialState(seed);
      const high = {
        ...state,
        communal: {
          ...state.communal,
          woodland: { ...state.communal.woodland, density: 100 },
          wildlife: { ...state.communal.wildlife, hwcPressure: 30 },
        },
        player: {
          ...state.player,
          livestock: { cattle: 10, health: 70 },
          fields: state.player.fields.map((f) => ({
            ...f,
            stage: 'growing' as const,
            health: 80,
          })),
        },
      };
      const ctx = createTurnContext();
      const result = updateWildlife(high, ctx);
      if (result.communal.wildlife.hwcPressure > 30) {
        foundIncrease = true;
        break;
      }
    }
    expect(foundIncrease).toBe(true);
  });
});
