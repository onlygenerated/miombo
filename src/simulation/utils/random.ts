/** Serializable RNG state for save/load. */
export interface RngState {
  seed: number;
  state: number;
}

/** Create a new seeded RNG. */
export function createRng(seed: number): RngState {
  return { seed, state: seed };
}

/**
 * Generate the next random float in [0, 1) and advance the RNG state.
 * Uses mulberry32 — fast, good distribution, fully deterministic.
 */
export function random(rng: RngState): number {
  let t = (rng.state += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const result = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return result;
}

/** Random integer in [min, max] (inclusive). */
export function randomInt(rng: RngState, min: number, max: number): number {
  return min + Math.floor(random(rng) * (max - min + 1));
}

/** Random float in [min, max). */
export function randomFloat(rng: RngState, min: number, max: number): number {
  return min + random(rng) * (max - min);
}

/** Pick a random element from an array. */
export function randomChoice<T>(rng: RngState, items: readonly T[]): T {
  return items[Math.floor(random(rng) * items.length)];
}

/** Return true with the given probability (0-1). */
export function randomChance(rng: RngState, probability: number): boolean {
  return random(rng) < probability;
}
