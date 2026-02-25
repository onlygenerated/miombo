import type { GameState } from '../GameState.js';
import type { TurnContext } from '../TurnContext.js';
import { LIVESTOCK } from '../../config.js';
import { clamp } from '../utils/clamp.js';
import { randomChance } from '../utils/random.js';

/**
 * Livestock system — cattle health, births, deaths, starvation, production.
 *
 * Cattle health lerps toward grazing quality.
 * Monthly birth/death based on annual rates / 12.
 * Starvation below biomass threshold.
 * Produces milk + manure.
 */
export function updateLivestock(state: GameState, ctx: TurnContext): GameState {
  const ls = state.player.livestock;
  const grazing = state.communal.grazing;
  let cattle = ls.cattle;
  let health = ls.health;

  if (cattle <= 0) {
    return {
      ...state,
      player: {
        ...state.player,
        livestock: { cattle: 0, health: 0 },
      },
    };
  }

  // ── Health lerps toward grazing quality ──
  const grazingQuality = grazing.health;
  const healthDelta = (grazingQuality - health) * LIVESTOCK.HEALTH_GRAZE_FACTOR * 0.1;
  health = clamp(health + healthDelta, 0, 100);

  // ── Monthly births (annual rate / 12) ──
  const monthlyBirthRate = LIVESTOCK.BIRTH_RATE / 12;
  let births = 0;
  for (let i = 0; i < cattle; i++) {
    if (randomChance(state.rng, monthlyBirthRate)) {
      births++;
    }
  }

  // ── Monthly natural deaths (annual rate / 12) ──
  const monthlyDeathRate = LIVESTOCK.NATURAL_DEATH_RATE / 12;
  let naturalDeaths = 0;
  for (let i = 0; i < cattle; i++) {
    if (randomChance(state.rng, monthlyDeathRate)) {
      naturalDeaths++;
    }
  }

  // ── Starvation deaths ──
  let starvationDeaths = 0;
  if (grazing.biomass < LIVESTOCK.STARVATION_THRESHOLD) {
    for (let i = 0; i < cattle; i++) {
      if (randomChance(state.rng, LIVESTOCK.STARVATION_DEATH_RATE)) {
        starvationDeaths++;
      }
    }
    if (starvationDeaths > 0) {
      ctx.events.push(`${starvationDeaths} cattle died from starvation`);
    }
  }

  cattle = Math.max(0, cattle + births - naturalDeaths - starvationDeaths);

  // ── Production ──
  const milk = cattle * LIVESTOCK.MILK_PER_CATTLE;
  const manure = cattle * LIVESTOCK.MANURE_PER_CATTLE;

  if (births > 0) {
    ctx.events.push(`${births} calves born`);
  }

  return {
    ...state,
    player: {
      ...state.player,
      livestock: { cattle, health },
      stores: {
        ...state.player.stores,
        milk: state.player.stores.milk + milk,
        manure: state.player.stores.manure + manure,
      },
    },
  };
}
