import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../../src/simulation/GameState.js';
import { updateWeather } from '../../../src/simulation/systems/WeatherSystem.js';
import { CALENDAR } from '../../../src/config.js';

describe('WeatherSystem', () => {
  it('generates rainfall within seasonal range', () => {
    const state = createInitialState(42);
    // Start month is October → hot-dry
    expect(state.calendar.season).toBe('hot-dry');

    const result = updateWeather(state);
    const range = CALENDAR.RAINFALL_RANGES['hot-dry'];
    expect(result.calendar.rainfall).toBeGreaterThanOrEqual(range.min);
    expect(result.calendar.rainfall).toBeLessThan(range.max);
  });

  it('sets drought when rainfall below threshold', () => {
    // Force a state with rainy season but seed that produces low rainfall
    // We test the logic: drought = rainfall < DROUGHT_THRESHOLD
    const state = createInitialState(1);
    const result = updateWeather(state);
    // Hot-dry season: range 0.05-0.2, threshold 0.2
    // Many seeds will produce rainfall < 0.2 → drought
    expect(typeof result.calendar.drought).toBe('boolean');
    if (result.calendar.rainfall < CALENDAR.DROUGHT_THRESHOLD) {
      expect(result.calendar.drought).toBe(true);
    } else {
      expect(result.calendar.drought).toBe(false);
    }
  });

  it('produces different rainfall for different seeds', () => {
    const r1 = updateWeather(createInitialState(1));
    const r2 = updateWeather(createInitialState(999));
    expect(r1.calendar.rainfall).not.toBe(r2.calendar.rainfall);
  });

  it('does not mutate original state', () => {
    const state = createInitialState(42);
    const origRainfall = state.calendar.rainfall;
    updateWeather(state);
    expect(state.calendar.rainfall).toBe(origRainfall);
  });

  it('rainy season produces higher rainfall range', () => {
    const state = createInitialState(42);
    // Override to rainy season
    const rainyState = {
      ...state,
      calendar: { ...state.calendar, season: 'rainy' as const, month: 1 },
    };
    const result = updateWeather(rainyState);
    const range = CALENDAR.RAINFALL_RANGES['rainy'];
    expect(result.calendar.rainfall).toBeGreaterThanOrEqual(range.min);
    expect(result.calendar.rainfall).toBeLessThan(range.max);
  });

  it('cool-dry season uses correct range', () => {
    const state = createInitialState(42);
    const coolState = {
      ...state,
      calendar: { ...state.calendar, season: 'cool-dry' as const, month: 5 },
    };
    const result = updateWeather(coolState);
    const range = CALENDAR.RAINFALL_RANGES['cool-dry'];
    expect(result.calendar.rainfall).toBeGreaterThanOrEqual(range.min);
    expect(result.calendar.rainfall).toBeLessThan(range.max);
  });

  it('preserves non-calendar state', () => {
    const state = createInitialState(42);
    const result = updateWeather(state);
    expect(result.player).toBe(state.player);
    expect(result.communal).toBe(state.communal);
    expect(result.economy).toBe(state.economy);
  });
});
