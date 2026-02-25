import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../../src/simulation/GameState.js';
import { updateCrops } from '../../../src/simulation/systems/CropSystem.js';
import { CROP } from '../../../src/config.js';

function withField(stage: string, health = 100, monthsInStage = 0) {
  const state = createInitialState(42);
  return {
    ...state,
    calendar: { ...state.calendar, rainfall: 0.5, drought: false },
    player: {
      ...state.player,
      fields: [{ id: 0, stage: stage as any, health, monthsInStage }],
    },
  };
}

describe('CropSystem', () => {
  it('planted transitions to growing', () => {
    const state = withField('planted');
    const result = updateCrops(state);
    expect(result.player.fields[0].stage).toBe('growing');
    expect(result.player.fields[0].monthsInStage).toBe(0);
  });

  it('growing increments monthsInStage', () => {
    const state = withField('growing', 100, 0);
    const result = updateCrops(state);
    expect(result.player.fields[0].stage).toBe('growing');
    expect(result.player.fields[0].monthsInStage).toBe(1);
  });

  it('growing transitions to ready after GROW_MONTHS', () => {
    // Set monthsInStage to GROW_MONTHS - 1 so after +1 it hits threshold
    const state = withField('growing', 100, CROP.GROW_MONTHS - 1);
    const result = updateCrops(state);
    expect(result.player.fields[0].stage).toBe('ready');
    expect(result.player.fields[0].monthsInStage).toBe(0);
  });

  it('fallow fields do not advance stage', () => {
    const state = withField('fallow');
    const result = updateCrops(state);
    expect(result.player.fields[0].stage).toBe('fallow');
  });

  it('prepared fields do not advance stage', () => {
    const state = withField('prepared');
    const result = updateCrops(state);
    expect(result.player.fields[0].stage).toBe('prepared');
  });

  it('ready fields do not advance stage', () => {
    const state = withField('ready');
    const result = updateCrops(state);
    expect(result.player.fields[0].stage).toBe('ready');
  });

  it('drought reduces growing field health', () => {
    const state = {
      ...withField('growing', 80, 1),
      calendar: {
        ...withField('growing').calendar,
        rainfall: 0.1,
        drought: true,
      },
    };
    const result = updateCrops(state);
    expect(result.player.fields[0].health).toBeLessThan(80);
  });

  it('good rainfall boosts growing field health', () => {
    const state = {
      ...withField('growing', 80, 1),
      calendar: {
        ...withField('growing').calendar,
        rainfall: 0.8,
        drought: false,
      },
    };
    const result = updateCrops(state);
    expect(result.player.fields[0].health).toBeGreaterThan(80);
  });

  it('field health is clamped to [0, 100]', () => {
    // Drought with low health
    const state = {
      ...withField('growing', 5, 1),
      calendar: { ...withField('growing').calendar, rainfall: 0.1, drought: true },
    };
    const result = updateCrops(state);
    expect(result.player.fields[0].health).toBeGreaterThanOrEqual(0);

    // Good rain at high health
    const state2 = {
      ...withField('growing', 98, 1),
      calendar: { ...withField('growing').calendar, rainfall: 0.9, drought: false },
    };
    const result2 = updateCrops(state2);
    expect(result2.player.fields[0].health).toBeLessThanOrEqual(100);
  });

  it('does not mutate original state', () => {
    const state = withField('planted');
    updateCrops(state);
    expect(state.player.fields[0].stage).toBe('planted');
  });
});
