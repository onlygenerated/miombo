import type { GameState } from '../GameState.js';
import type { TurnContext } from '../TurnContext.js';
import { WILDLIFE, CROP, LIVESTOCK } from '../../config.js';
import { clamp } from '../utils/clamp.js';
import { randomChance, randomFloat } from '../utils/random.js';

/**
 * Wildlife system — conservation paradox and HWC (Human-Wildlife Conflict).
 *
 * presence = woodland density × PRESENCE_WOODLAND_FACTOR (0.8).
 * Healthy woodland → more wildlife → more crop raids + predation.
 * Mitigations: chilli fence (60%), crop layout (30%), night kraal (80%).
 */
export function updateWildlife(state: GameState, ctx: TurnContext): GameState {
  const w = state.communal.wildlife;
  const density = state.communal.woodland.density;

  // ── Wildlife presence tracks woodland density ──
  const presence = density * WILDLIFE.PRESENCE_WOODLAND_FACTOR;

  // ── Crop raids ──
  let cropRaidChance = WILDLIFE.HWC_CROP_CHANCE_BASE * (presence / 100);
  if (state.player.hwcMitigation.chilliFence) {
    cropRaidChance *= 1 - WILDLIFE.CHILLI_FENCE_REDUCTION;
  }
  if (state.player.hwcMitigation.cropLayout) {
    cropRaidChance *= 1 - WILDLIFE.CROP_LAYOUT_REDUCTION;
  }

  let cropDamageEvent = false;
  const newFields = state.player.fields.map((field) => {
    if (
      (field.stage === 'growing' || field.stage === 'ready') &&
      randomChance(state.rng, cropRaidChance)
    ) {
      const damage = randomFloat(state.rng, CROP.HWC_DAMAGE_MIN, CROP.HWC_DAMAGE_MAX);
      cropDamageEvent = true;
      return {
        ...field,
        health: clamp(field.health - damage * 100, 0, 100),
      };
    }
    return field;
  });

  if (cropDamageEvent) {
    ctx.events.push('Wildlife raided crops!');
  }

  // ── Livestock predation ──
  let predationChance = WILDLIFE.HWC_LIVESTOCK_CHANCE_BASE * (presence / 100);
  if (state.player.hwcMitigation.nightKraal) {
    predationChance *= 1 - LIVESTOCK.NIGHT_KRAAL_REDUCTION;
  }

  let cattleLost = 0;
  const cattle = state.player.livestock.cattle;
  for (let i = 0; i < cattle; i++) {
    if (randomChance(state.rng, predationChance)) {
      cattleLost++;
    }
  }

  if (cattleLost > 0) {
    ctx.events.push(`${cattleLost} cattle lost to predators`);
  }

  // ── HWC pressure ──
  const hwcPressure = cropDamageEvent || cattleLost > 0
    ? clamp(w.hwcPressure + 10, 0, 100)
    : clamp(w.hwcPressure - 2, 0, 100);

  // ── Recent events (keep last 5) ──
  const recentEvents = [...ctx.events.filter((e) =>
    e.includes('crop') || e.includes('predator') || e.includes('Wildlife'),
  )];
  const allRecent = [...w.recentEvents, ...recentEvents].slice(-5);

  return {
    ...state,
    player: {
      ...state.player,
      fields: newFields,
      livestock: {
        ...state.player.livestock,
        cattle: Math.max(0, cattle - cattleLost),
      },
    },
    communal: {
      ...state.communal,
      wildlife: {
        presence,
        hwcPressure,
        recentEvents: allRecent,
      },
    },
  };
}
