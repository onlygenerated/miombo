import type { GameState } from '../GameState.js';
import type { Field, CropStage } from '../models/Farm.js';
import { CROP } from '../../config.js';
import { clamp } from '../utils/clamp.js';

/**
 * Crop system — monthly field progression.
 *
 * planted → growing auto-transition.
 * growing → ready after GROW_MONTHS (4).
 * Drought/rain effects on field health.
 */
export function updateCrops(state: GameState): GameState {
  const { drought, rainfall } = state.calendar;

  const newFields = state.player.fields.map((field) => {
    let f = { ...field };

    // Advance months in stage
    f.monthsInStage += 1;

    // Stage transitions
    if (f.stage === 'planted') {
      // Auto-transition to growing
      f = { ...f, stage: 'growing' as CropStage, monthsInStage: 0 };
    } else if (f.stage === 'growing' && f.monthsInStage >= CROP.GROW_MONTHS) {
      // Ready for harvest
      f = { ...f, stage: 'ready' as CropStage, monthsInStage: 0 };
    }

    // Weather effects on active crops (growing or planted)
    if (f.stage === 'growing') {
      if (drought) {
        f = { ...f, health: clamp(f.health - 15, 0, 100) };
      } else if (rainfall > 0.6) {
        // Good rain bonus
        f = { ...f, health: clamp(f.health + 5, 0, 100) };
      }
    }

    return f;
  });

  return {
    ...state,
    player: {
      ...state.player,
      fields: newFields,
    },
  };
}
