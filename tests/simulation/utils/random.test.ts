import { describe, it, expect } from 'vitest';
import {
  createRng, random, randomInt, randomFloat, randomChoice, randomChance,
} from '../../../src/simulation/utils/random.js';

describe('seeded PRNG', () => {
  it('is deterministic — same seed produces same sequence', () => {
    const rng1 = createRng(42);
    const rng2 = createRng(42);
    const seq1 = Array.from({ length: 10 }, () => random(rng1));
    const seq2 = Array.from({ length: 10 }, () => random(rng2));
    expect(seq1).toEqual(seq2);
  });

  it('different seeds produce different sequences', () => {
    const rng1 = createRng(42);
    const rng2 = createRng(99);
    const v1 = random(rng1);
    const v2 = random(rng2);
    expect(v1).not.toBe(v2);
  });

  it('random() returns values in [0, 1)', () => {
    const rng = createRng(123);
    for (let i = 0; i < 1000; i++) {
      const v = random(rng);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('RngState is serializable', () => {
    const rng = createRng(42);
    random(rng); random(rng); // advance
    const serialized = JSON.parse(JSON.stringify(rng));
    expect(serialized.seed).toBe(rng.seed);
    expect(serialized.state).toBe(rng.state);
    // Continuing from serialized state produces same result
    const v1 = random(rng);
    const v2 = random(serialized);
    expect(v1).toBe(v2);
  });
});

describe('randomInt', () => {
  it('returns integers in [min, max]', () => {
    const rng = createRng(7);
    for (let i = 0; i < 200; i++) {
      const v = randomInt(rng, 1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});

describe('randomFloat', () => {
  it('returns floats in [min, max)', () => {
    const rng = createRng(13);
    for (let i = 0; i < 200; i++) {
      const v = randomFloat(rng, 2.0, 5.0);
      expect(v).toBeGreaterThanOrEqual(2.0);
      expect(v).toBeLessThan(5.0);
    }
  });
});

describe('randomChoice', () => {
  it('picks from the array', () => {
    const rng = createRng(50);
    const items = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 50; i++) {
      expect(items).toContain(randomChoice(rng, items));
    }
  });
});

describe('randomChance', () => {
  it('probability 0 always returns false', () => {
    const rng = createRng(1);
    for (let i = 0; i < 50; i++) {
      expect(randomChance(rng, 0)).toBe(false);
    }
  });

  it('probability 1 always returns true', () => {
    const rng = createRng(1);
    for (let i = 0; i < 50; i++) {
      expect(randomChance(rng, 1)).toBe(true);
    }
  });
});
