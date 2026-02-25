import { describe, it, expect } from 'vitest';
import {
  CALENDAR, GRAZING, WOODLAND, CROP, LIVESTOCK,
  ECONOMY, GOVERNANCE, WILDLIFE, PLAYER,
  NEIGHBOR_ARCHETYPES, GENERATION,
} from '../../src/config.js';

describe('config sanity', () => {
  it('degradation thresholds are descending', () => {
    const t = GRAZING.DEGRADATION_THRESHOLDS;
    for (let i = 1; i < t.length; i++) {
      expect(t[i]).toBeLessThan(t[i - 1]);
    }
  });

  it('woodland density bands are descending', () => {
    expect(WOODLAND.DENSITY_BANDS.HIGH).toBeGreaterThan(WOODLAND.DENSITY_BANDS.MID);
    expect(WOODLAND.DENSITY_BANDS.MID).toBeGreaterThan(WOODLAND.DENSITY_BANDS.CRITICAL);
  });

  it('charcoal is more destructive than firewood', () => {
    expect(WOODLAND.CHARCOAL_EXTRACTION).toBeGreaterThan(WOODLAND.FIREWOOD_EXTRACTION);
  });

  it('all neighbor traits are in [0, 1]', () => {
    for (const arch of NEIGHBOR_ARCHETYPES) {
      for (const [key, val] of Object.entries(arch.traits)) {
        expect(val, `${arch.name}.${key}`).toBeGreaterThanOrEqual(0);
        expect(val, `${arch.name}.${key}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('has exactly 3 neighbor archetypes', () => {
    expect(NEIGHBOR_ARCHETYPES).toHaveLength(3);
  });

  it('each archetype has id, name, wealth, cattle, traits', () => {
    for (const arch of NEIGHBOR_ARCHETYPES) {
      expect(arch.id).toBeTruthy();
      expect(arch.name).toBeTruthy();
      expect(['wealthy', 'middle', 'poor']).toContain(arch.wealth);
      expect(arch.cattle).toBeGreaterThan(0);
      expect(arch.traits.greed).toBeDefined();
      expect(arch.traits.caution).toBeDefined();
      expect(arch.traits.social).toBeDefined();
      expect(arch.traits.adaptability).toBeDefined();
    }
  });

  it('calendar turns per chapter = 12 years', () => {
    expect(CALENDAR.TURNS_PER_CHAPTER).toBe(CALENDAR.TURNS_PER_YEAR * 12);
  });

  it('governance initial values are in valid range', () => {
    expect(GOVERNANCE.INITIAL_TRUST).toBeGreaterThanOrEqual(0);
    expect(GOVERNANCE.INITIAL_TRUST).toBeLessThanOrEqual(100);
    expect(GOVERNANCE.INITIAL_COHESION).toBeGreaterThanOrEqual(0);
    expect(GOVERNANCE.INITIAL_COHESION).toBeLessThanOrEqual(100);
    expect(GOVERNANCE.INITIAL_MONITORING).toBeGreaterThanOrEqual(0);
    expect(GOVERNANCE.INITIAL_MONITORING).toBeLessThanOrEqual(100);
  });

  it('crop stages follow expected order', () => {
    expect(CROP.MAIZE_STAGES).toEqual(['fallow', 'prepared', 'planted', 'growing', 'ready']);
  });

  it('inheritance percentages are in (0, 1]', () => {
    expect(GENERATION.CATTLE_INHERITANCE).toBeGreaterThan(0);
    expect(GENERATION.CATTLE_INHERITANCE).toBeLessThanOrEqual(1);
    expect(GENERATION.MONEY_INHERITANCE).toBeGreaterThan(0);
    expect(GENERATION.MONEY_INHERITANCE).toBeLessThanOrEqual(1);
    expect(GENERATION.KNOWLEDGE_INHERITANCE).toBeGreaterThan(0);
    expect(GENERATION.KNOWLEDGE_INHERITANCE).toBeLessThanOrEqual(1);
  });

  it('starting money matches economy config', () => {
    expect(ECONOMY.STARTING_MONEY).toBe(500_000);
  });

  it('player starting stores has all expected keys', () => {
    const keys = Object.keys(PLAYER.STARTING_STORES);
    expect(keys).toContain('grain');
    expect(keys).toContain('firewood');
    expect(keys).toContain('charcoal');
    expect(keys).toContain('manure');
    expect(keys).toContain('seeds');
    expect(keys).toContain('milk');
  });
});
