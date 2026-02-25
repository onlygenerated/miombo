import { describe, it, expect } from 'vitest';
import { getSeasonForMonth, SEASON_MONTHS } from '../../../src/simulation/models/Season.js';
import type { Season } from '../../../src/simulation/models/Season.js';

describe('getSeasonForMonth', () => {
  const expected: [number, Season][] = [
    [1, 'rainy'],
    [2, 'rainy'],
    [3, 'rainy'],
    [4, 'cool-dry'],
    [5, 'cool-dry'],
    [6, 'cool-dry'],
    [7, 'cool-dry'],
    [8, 'hot-dry'],
    [9, 'hot-dry'],
    [10, 'hot-dry'],
    [11, 'rainy'],
    [12, 'rainy'],
  ];

  for (const [month, season] of expected) {
    it(`month ${month} → ${season}`, () => {
      expect(getSeasonForMonth(month)).toBe(season);
    });
  }
});

describe('SEASON_MONTHS', () => {
  it('covers all 12 months exactly once', () => {
    const all = [
      ...SEASON_MONTHS['hot-dry'],
      ...SEASON_MONTHS['rainy'],
      ...SEASON_MONTHS['cool-dry'],
    ].sort((a, b) => a - b);
    expect(all).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});
