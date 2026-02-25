import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../../src/simulation/GameState.js';
import { processTurn } from '../../../src/simulation/TurnEngine.js';
import type { PlayerAction } from '../../../src/simulation/actions/PlayerAction.js';

/**
 * DESIGN.md verification tests — validate core gameplay dynamics.
 */

describe('Verification: Tragedy of the commons', () => {
  it('unmanaged commons with high cattle leads to biomass collapse and livestock loss', () => {
    let state = createInitialState(42);

    // Set neighbors to have large herds — consumption exceeds grass regrowth
    state = {
      ...state,
      player: {
        ...state.player,
        livestock: { ...state.player.livestock, cattle: 10 },
      },
      neighbors: state.neighbors.map(n => ({
        ...n,
        cattle: n.wealth === 'wealthy' ? 40 : n.wealth === 'middle' ? 25 : 15,
      })),
    };
    const initialCattle = state.player.livestock.cattle
      + state.neighbors.reduce((s, n) => s + n.cattle, 0);
    // Total: 90 cattle → consumption = 720/turn, growth << 720

    const restAction: PlayerAction[] = [{ type: 'rest' }, { type: 'rest' }];

    for (let i = 0; i < 48; i++) {
      state = processTurn(state, restAction);
    }

    // The tragedy: biomass collapses, cattle starve
    const finalCattle = state.player.livestock.cattle
      + state.neighbors.reduce((s, n) => s + n.cattle, 0);
    expect(state.communal.grazing.biomass).toBeLessThan(100);
    expect(finalCattle).toBeLessThan(initialCattle * 0.5);
  });
});

describe('Verification: Cooperation benefits', () => {
  it('144 turns with patrol + meetings keeps grazing healthier and builds trust', () => {
    let state = createInitialState(42);
    const initialTrust = state.communal.governance.communityTrust;

    for (let i = 0; i < 144; i++) {
      const actions: PlayerAction[] = [];

      // Alternate between patrol and meeting based on cooldown
      if (i % 3 === 0 && state.communal.governance.meetingCooldown === 0) {
        actions.push({ type: 'call-meeting' });
      } else {
        actions.push({ type: 'patrol' });
      }
      actions.push({ type: 'graze-cattle' });

      state = processTurn(state, actions);
    }

    // Grazing health should be better than 30 (not completely degraded)
    expect(state.communal.grazing.health).toBeGreaterThan(30);
    // Trust should have improved from the initial value
    expect(state.communal.governance.communityTrust).toBeGreaterThan(initialTrust);
  });
});

describe('Verification: HWC paradox', () => {
  it('high woodland density leads to wildlife presence and HWC pressure', () => {
    let state = createInitialState(42);

    // Run a few turns to let wildlife system process
    const restAction: PlayerAction[] = [{ type: 'rest' }, { type: 'rest' }];
    for (let i = 0; i < 24; i++) {
      state = processTurn(state, restAction);
    }

    // Wildlife presence should track woodland density
    // Initial woodland density is 70, so presence should be > 0
    expect(state.communal.wildlife.presence).toBeGreaterThan(0);
    // With initial density 70, presence ≈ 70 * 0.8 = 56
    expect(state.communal.wildlife.presence).toBeGreaterThan(20);
  });
});

describe('Verification: Benefit-cost of governance', () => {
  it('12 turns of governance vs passive shows monitoring/trust difference', () => {
    const seed = 42;

    // Passive path: rest only
    let passive = createInitialState(seed);
    const restAction: PlayerAction[] = [{ type: 'rest' }, { type: 'rest' }];
    for (let i = 0; i < 12; i++) {
      passive = processTurn(passive, restAction);
    }

    // Active governance path: patrol + meetings
    let active = createInitialState(seed);
    for (let i = 0; i < 12; i++) {
      const actions: PlayerAction[] = [{ type: 'patrol' }];
      if (i % 3 === 0 && active.communal.governance.meetingCooldown === 0) {
        actions.push({ type: 'call-meeting' });
      } else {
        actions.push({ type: 'graze-cattle' });
      }
      active = processTurn(active, actions);
    }

    // Active governance should have higher monitoring
    expect(active.communal.governance.monitoringLevel)
      .toBeGreaterThan(passive.communal.governance.monitoringLevel);
    // Active governance should have higher trust
    expect(active.communal.governance.communityTrust)
      .toBeGreaterThan(passive.communal.governance.communityTrust);
  });
});

describe('Verification: Save/load roundtrip', () => {
  it('50 turns then JSON serialize/deserialize preserves state', () => {
    let state = createInitialState(42);
    const actions: PlayerAction[] = [{ type: 'patrol' }, { type: 'rest' }];

    for (let i = 0; i < 50; i++) {
      state = processTurn(state, actions);
    }

    // Serialize and deserialize
    const json = JSON.stringify(state);
    const restored = JSON.parse(json);

    // Verify key state matches
    expect(restored.calendar.turn).toBe(state.calendar.turn);
    expect(restored.player.livestock.cattle).toBe(state.player.livestock.cattle);
    expect(restored.player.money).toBe(state.player.money);
    expect(restored.communal.grazing.health).toBe(state.communal.grazing.health);
    expect(restored.communal.woodland.density).toBe(state.communal.woodland.density);
    expect(restored.communal.governance.communityTrust)
      .toBe(state.communal.governance.communityTrust);
    expect(restored.neighbors.length).toBe(state.neighbors.length);
    expect(restored.generation.chapter).toBe(state.generation.chapter);
    expect(restored.rng.state).toBe(state.rng.state);
    expect(restored.narrativeEvents).toEqual(state.narrativeEvents);
    expect(restored.narrativeEventCooldowns).toEqual(state.narrativeEventCooldowns);
  });
});
