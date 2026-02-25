import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../../src/simulation/GameState.js';
import { updateNeighborAI } from '../../../src/simulation/systems/NeighborAISystem.js';
import { createTurnContext } from '../../../src/simulation/TurnContext.js';

describe('NeighborAISystem', () => {
  it('populates neighborActions in context', () => {
    const state = createInitialState(42);
    const ctx = createTurnContext();
    updateNeighborAI(state, ctx);
    expect(ctx.neighborActions).toHaveLength(3); // 3 neighbors
  });

  it('all neighbors graze by default', () => {
    const state = createInitialState(42);
    const ctx = createTurnContext();
    updateNeighborAI(state, ctx);
    expect(ctx.neighborActions.every((n) => n.grazed)).toBe(true);
  });

  it('desperate neighbors violate more', () => {
    let desperateViolations = 0;
    let calmViolations = 0;
    const trials = 200;

    for (let seed = 1; seed <= trials; seed++) {
      // Desperate state
      const desperate = createInitialState(seed);
      const despState = {
        ...desperate,
        neighbors: desperate.neighbors.map((n) => ({
          ...n,
          desperation: 90,
        })),
        communal: {
          ...desperate.communal,
          governance: {
            ...desperate.communal.governance,
            rules: [
              {
                type: 'grazing-limit' as const,
                details: { limit: 10 },
                votedFor: 3,
                votedAgainst: 1,
                compliance: 50,
                turnsActive: 5,
                locallyDefined: true,
              },
            ],
          },
        },
      };
      const ctx1 = createTurnContext();
      updateNeighborAI(despState, ctx1);
      desperateViolations += ctx1.neighborActions.filter((a) => a.violated).length;

      // Calm state (same seed for fair comparison — but different RNG state)
      const calm = createInitialState(seed);
      const calmState = {
        ...calm,
        neighbors: calm.neighbors.map((n) => ({
          ...n,
          desperation: 5,
        })),
        communal: {
          ...calm.communal,
          governance: {
            ...calm.communal.governance,
            rules: despState.communal.governance.rules,
          },
        },
      };
      const ctx2 = createTurnContext();
      updateNeighborAI(calmState, ctx2);
      calmViolations += ctx2.neighborActions.filter((a) => a.violated).length;
    }

    expect(desperateViolations).toBeGreaterThan(calmViolations);
  });

  it('social neighbors comply more', () => {
    let socialViolations = 0;
    let antisocialViolations = 0;
    const trials = 200;

    for (let seed = 1; seed <= trials; seed++) {
      const base = createInitialState(seed);
      const rulesState = {
        ...base,
        communal: {
          ...base.communal,
          governance: {
            ...base.communal.governance,
            rules: [
              {
                type: 'grazing-limit' as const,
                details: { limit: 10 },
                votedFor: 3,
                votedAgainst: 1,
                compliance: 50,
                turnsActive: 5,
                locallyDefined: true,
              },
            ],
          },
        },
      };

      // High social traits
      const socialState = {
        ...rulesState,
        neighbors: rulesState.neighbors.map((n) => ({
          ...n,
          traits: { ...n.traits, social: 0.9 },
          desperation: 50,
        })),
      };
      const ctx1 = createTurnContext();
      updateNeighborAI(socialState, ctx1);
      socialViolations += ctx1.neighborActions.filter((a) => a.violated).length;

      // Low social traits
      const antisocialState = {
        ...createInitialState(seed),
        neighbors: base.neighbors.map((n) => ({
          ...n,
          traits: { ...n.traits, social: 0.1 },
          desperation: 50,
        })),
        communal: rulesState.communal,
      };
      const ctx2 = createTurnContext();
      updateNeighborAI(antisocialState, ctx2);
      antisocialViolations += ctx2.neighborActions.filter((a) => a.violated).length;
    }

    expect(socialViolations).toBeLessThan(antisocialViolations);
  });

  it('greedy neighbors extract more', () => {
    let greedyExtraction = 0;
    let cautiousExtraction = 0;
    const trials = 100;

    for (let seed = 1; seed <= trials; seed++) {
      // Greedy neighbors
      const greedy = createInitialState(seed);
      const greedyState = {
        ...greedy,
        neighbors: greedy.neighbors.map((n) => ({
          ...n,
          traits: { ...n.traits, greed: 0.9, caution: 0.1 },
        })),
      };
      const ctx1 = createTurnContext();
      updateNeighborAI(greedyState, ctx1);
      greedyExtraction += ctx1.totalWoodExtracted + ctx1.totalCharcoalProduced;

      // Cautious neighbors
      const cautious = createInitialState(seed);
      const cautiousState = {
        ...cautious,
        neighbors: cautious.neighbors.map((n) => ({
          ...n,
          traits: { ...n.traits, greed: 0.1, caution: 0.9 },
        })),
      };
      const ctx2 = createTurnContext();
      updateNeighborAI(cautiousState, ctx2);
      cautiousExtraction += ctx2.totalWoodExtracted + ctx2.totalCharcoalProduced;
    }

    expect(greedyExtraction).toBeGreaterThan(cautiousExtraction);
  });

  it('updates neighbor desperation', () => {
    const state = createInitialState(42);
    // Inonge has 1 cattle → desperation should increase
    const ctx = createTurnContext();
    const result = updateNeighborAI(state, ctx);
    const inonge = result.neighbors.find((n) => n.id === 'inonge')!;
    const origInonge = state.neighbors.find((n) => n.id === 'inonge')!;
    expect(inonge.desperation).toBeGreaterThan(origInonge.desperation);

    // Mubita has 8 cattle → desperation should decrease
    const mubita = result.neighbors.find((n) => n.id === 'mubita')!;
    const origMubita = state.neighbors.find((n) => n.id === 'mubita')!;
    expect(mubita.desperation).toBeLessThan(origMubita.desperation);
  });

  it('does not mutate original state', () => {
    const state = createInitialState(42);
    const origDesperation = state.neighbors[0].desperation;
    const ctx = createTurnContext();
    updateNeighborAI(state, ctx);
    expect(state.neighbors[0].desperation).toBe(origDesperation);
  });
});
