import type { GameState } from '../GameState.js';
import { CALENDAR } from '../../config.js';
import { randomFloat } from '../utils/random.js';

/**
 * Generate seasonal rainfall and determine drought status.
 * Called first in the turn pipeline — other systems depend on rainfall.
 */
export function updateWeather(state: GameState): GameState {
  const { season } = state.calendar;
  const range = CALENDAR.RAINFALL_RANGES[season];

  const rainfall = randomFloat(state.rng, range.min, range.max);
  const drought = rainfall < CALENDAR.DROUGHT_THRESHOLD;

  return {
    ...state,
    calendar: {
      ...state.calendar,
      rainfall,
      drought,
    },
  };
}
