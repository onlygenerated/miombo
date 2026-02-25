export type Season = 'hot-dry' | 'rainy' | 'cool-dry';

/** Which months belong to which season. */
export const SEASON_MONTHS: Record<Season, readonly number[]> = {
  'hot-dry': [8, 9, 10],   // Aug, Sep, Oct
  'rainy': [11, 12, 1, 2, 3], // Nov-Mar
  'cool-dry': [4, 5, 6, 7],   // Apr-Jul
};

/** Serializable calendar state. */
export interface CalendarState {
  month: number;       // 1-12
  year: number;        // Starts at 1
  season: Season;
  turn: number;        // Cumulative turn counter
  rainfall: number;    // 0-1 normalized for current month
  drought: boolean;
}

/** Get the season for a given month (1-12). */
export function getSeasonForMonth(month: number): Season {
  if (month >= 8 && month <= 10) return 'hot-dry';
  if (month >= 11 || month <= 3) return 'rainy';
  return 'cool-dry';
}
