import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/simulation/GameState.js';

describe('createInitialState', () => {
  const state = createInitialState(42);

  // Structure
  it('has all top-level keys', () => {
    expect(state.calendar).toBeDefined();
    expect(state.player).toBeDefined();
    expect(state.communal).toBeDefined();
    expect(state.neighbors).toBeDefined();
    expect(state.economy).toBeDefined();
    expect(state.generation).toBeDefined();
    expect(state.events).toBeDefined();
    expect(state.rng).toBeDefined();
  });

  // Calendar defaults
  it('starts in October year 1', () => {
    expect(state.calendar.month).toBe(10);
    expect(state.calendar.year).toBe(1);
    expect(state.calendar.season).toBe('hot-dry');
    expect(state.calendar.turn).toBe(0);
  });

  // Player defaults
  it('player starts with 2 fallow fields', () => {
    expect(state.player.fields).toHaveLength(2);
    expect(state.player.fields[0].stage).toBe('fallow');
    expect(state.player.fields[1].stage).toBe('fallow');
  });

  it('player starts with 3 cattle and 500K', () => {
    expect(state.player.livestock.cattle).toBe(3);
    expect(state.player.money).toBe(500_000);
  });

  it('player starts with 30 grain', () => {
    expect(state.player.stores.grain).toBe(30);
  });

  it('player starts with expected reputation/knowledge/wellbeing', () => {
    expect(state.player.reputation).toBe(50);
    expect(state.player.knowledge).toBe(30);
    expect(state.player.wellbeing).toBe(60);
  });

  // Communal land
  it('communal land starts healthy', () => {
    expect(state.communal.grazing.health).toBe(80);
    expect(state.communal.woodland.density).toBe(70);
    expect(state.communal.wildlife.presence).toBe(40);
  });

  // Governance baseline
  it('governance starts at baseline', () => {
    expect(state.communal.governance.communityTrust).toBe(40);
    expect(state.communal.governance.rules).toHaveLength(0);
    expect(state.communal.governance.exclusionRights).toBe(false);
  });

  // Neighbors
  it('has 3 neighbors from archetypes', () => {
    expect(state.neighbors).toHaveLength(3);
    const ids = state.neighbors.map((n) => n.id);
    expect(ids).toContain('mubita');
    expect(ids).toContain('nasilele');
    expect(ids).toContain('inonge');
  });

  it('neighbor desperation scales by wealth', () => {
    const mubita = state.neighbors.find((n) => n.id === 'mubita')!;
    const nasilele = state.neighbors.find((n) => n.id === 'nasilele')!;
    const inonge = state.neighbors.find((n) => n.id === 'inonge')!;
    expect(mubita.desperation).toBeLessThan(nasilele.desperation);
    expect(nasilele.desperation).toBeLessThan(inonge.desperation);
  });

  // Determinism
  it('same seed produces identical state', () => {
    const state1 = createInitialState(42);
    const state2 = createInitialState(42);
    expect(state1).toEqual(state2);
  });

  // JSON roundtrip
  it('survives JSON.parse(JSON.stringify()) roundtrip', () => {
    const roundtripped = JSON.parse(JSON.stringify(state));
    expect(roundtripped).toEqual(state);
  });

  // Different seed
  it('different seed produces different RNG state', () => {
    const state1 = createInitialState(42);
    const state2 = createInitialState(99);
    expect(state1.rng.state).not.toBe(state2.rng.state);
  });
});
