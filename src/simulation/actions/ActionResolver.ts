import type { GameState } from '../GameState.js';
import type { TurnContext } from '../TurnContext.js';
import type { PlayerAction } from './PlayerAction.js';
import type { Field } from '../models/Farm.js';
import { ACTION_COSTS, CALENDAR, CROP, GOVERNANCE, WOODLAND } from '../../config.js';
import { clamp } from '../utils/clamp.js';

/**
 * Resolve player actions — applies immediate effects to state.
 * Called after WeatherSystem in the turn pipeline.
 * Returns updated state; also mutates ctx to record what happened.
 */
export function resolveActions(
  state: GameState,
  actions: PlayerAction[],
  ctx: TurnContext,
): GameState {
  let current = state;
  for (const action of actions) {
    current = resolveOne(current, action, ctx);
  }
  return current;
}

function resolveOne(state: GameState, action: PlayerAction, ctx: TurnContext): GameState {
  switch (action.type) {
    case 'prepare-field':
      return prepareField(state, action.fieldId);
    case 'plant-crops':
      return plantCrops(state, action.fieldId);
    case 'tend-crops':
      return tendCrops(state, action.fieldId);
    case 'harvest':
      return harvest(state, action.fieldId);
    case 'graze-cattle':
      return grazeCattle(state, ctx);
    case 'buy-cattle':
      return buyCattle(state, action.quantity);
    case 'sell-cattle':
      return sellCattle(state, action.quantity);
    case 'collect-firewood':
      return collectFirewood(state, ctx);
    case 'produce-charcoal':
      return produceCharcoal(state, ctx);
    case 'sell-goods':
      return sellGoods(state, action.commodity, action.quantity);
    case 'buy-seeds':
      return buySeeds(state, action.quantity);
    case 'patrol':
      return patrol(state, ctx);
    case 'call-meeting':
      return callMeeting(state, ctx);
    case 'consult-ta':
      return consultTA(state, ctx);
    case 'build-chilli-fence':
      return buildChilliFence(state);
    case 'build-night-kraal':
      return buildNightKraal(state);
    case 'set-crop-layout':
      return setCropLayout(state);
    case 'rest':
      return rest(state);
  }
}

// ─── Field Helpers ──────────────────────────────────────────────────

function updateField(state: GameState, fieldId: number, updater: (f: Field) => Field): GameState {
  const fields = state.player.fields.map((f) => (f.id === fieldId ? updater(f) : f));
  return { ...state, player: { ...state.player, fields } };
}

function prepareField(state: GameState, fieldId: number): GameState {
  const field = state.player.fields.find((f) => f.id === fieldId);
  if (!field || field.stage !== 'fallow') return state;
  return updateField(state, fieldId, (f) => ({
    ...f,
    stage: 'prepared',
    monthsInStage: 0,
  }));
}

function plantCrops(state: GameState, fieldId: number): GameState {
  const field = state.player.fields.find((f) => f.id === fieldId);
  if (!field || field.stage !== 'prepared') return state;
  if (state.player.stores.seeds < ACTION_COSTS.SEEDS_PER_PLANT) return state;
  const newState = updateField(state, fieldId, (f) => ({
    ...f,
    stage: 'planted',
    monthsInStage: 0,
  }));
  return {
    ...newState,
    player: {
      ...newState.player,
      stores: {
        ...newState.player.stores,
        seeds: newState.player.stores.seeds - ACTION_COSTS.SEEDS_PER_PLANT,
      },
    },
  };
}

function tendCrops(state: GameState, fieldId: number): GameState {
  const field = state.player.fields.find((f) => f.id === fieldId);
  if (!field || (field.stage !== 'planted' && field.stage !== 'growing')) return state;
  return updateField(state, fieldId, (f) => ({
    ...f,
    health: clamp(f.health + ACTION_COSTS.TEND_CROPS_BONUS, 0, 100),
  }));
}

function harvest(state: GameState, fieldId: number): GameState {
  const field = state.player.fields.find((f) => f.id === fieldId);
  if (!field || field.stage !== 'ready') return state;

  const yieldAmount = Math.round(CROP.BASE_YIELD * (field.health / 100));
  const newState = updateField(state, fieldId, (f) => ({
    ...f,
    stage: 'fallow',
    health: 100,
    monthsInStage: 0,
  }));
  return {
    ...newState,
    player: {
      ...newState.player,
      stores: {
        ...newState.player.stores,
        grain: newState.player.stores.grain + yieldAmount,
      },
    },
  };
}

// ─── Livestock ──────────────────────────────────────────────────────

function grazeCattle(state: GameState, ctx: TurnContext): GameState {
  // Active grazing = management bonus to cattle health
  ctx.events.push('Player actively managed cattle grazing');
  return {
    ...state,
    player: {
      ...state.player,
      livestock: {
        ...state.player.livestock,
        health: clamp(state.player.livestock.health + ACTION_COSTS.GRAZE_HEALTH_BONUS, 0, 100),
      },
    },
  };
}

function buyCattle(state: GameState, quantity: number): GameState {
  const cost = quantity * state.economy.prices.cattle;
  if (state.player.money < cost || quantity <= 0) return state;
  return {
    ...state,
    player: {
      ...state.player,
      money: state.player.money - cost,
      livestock: {
        ...state.player.livestock,
        cattle: state.player.livestock.cattle + quantity,
      },
    },
  };
}

function sellCattle(state: GameState, quantity: number): GameState {
  if (state.player.livestock.cattle < quantity || quantity <= 0) return state;
  const revenue = quantity * state.economy.prices.cattle;
  return {
    ...state,
    player: {
      ...state.player,
      money: state.player.money + revenue,
      livestock: {
        ...state.player.livestock,
        cattle: state.player.livestock.cattle - quantity,
      },
    },
  };
}

// ─── Woodland ───────────────────────────────────────────────────────

function collectFirewood(state: GameState, ctx: TurnContext): GameState {
  const extraction = WOODLAND.FIREWOOD_EXTRACTION;
  const newDensity = Math.max(0, state.communal.woodland.density - extraction);
  ctx.totalWoodExtracted += extraction;
  return {
    ...state,
    player: {
      ...state.player,
      stores: {
        ...state.player.stores,
        firewood: state.player.stores.firewood + ACTION_COSTS.FIREWOOD_YIELD,
      },
    },
    communal: {
      ...state.communal,
      woodland: {
        ...state.communal.woodland,
        density: newDensity,
      },
    },
  };
}

function produceCharcoal(state: GameState, ctx: TurnContext): GameState {
  const extraction = WOODLAND.CHARCOAL_EXTRACTION;
  const newDensity = Math.max(0, state.communal.woodland.density - extraction);
  ctx.totalCharcoalProduced += extraction;
  return {
    ...state,
    player: {
      ...state.player,
      stores: {
        ...state.player.stores,
        charcoal: state.player.stores.charcoal + ACTION_COSTS.CHARCOAL_YIELD,
      },
    },
    communal: {
      ...state.communal,
      woodland: {
        ...state.communal.woodland,
        density: newDensity,
      },
    },
  };
}

// ─── Market ─────────────────────────────────────────────────────────

function sellGoods(
  state: GameState,
  commodity: 'maize' | 'firewood' | 'charcoal' | 'milk' | 'manure',
  quantity: number,
): GameState {
  // Map commodity to store key (maize → grain)
  const storeKey = commodity === 'maize' ? 'grain' : commodity;
  if (state.player.stores[storeKey] < quantity || quantity <= 0) return state;
  const revenue = quantity * state.economy.prices[commodity];
  return {
    ...state,
    player: {
      ...state.player,
      money: state.player.money + revenue,
      stores: {
        ...state.player.stores,
        [storeKey]: state.player.stores[storeKey] - quantity,
      },
    },
  };
}

function buySeeds(state: GameState, quantity: number): GameState {
  const cost = quantity * state.economy.prices.seeds;
  if (state.player.money < cost || quantity <= 0) return state;
  return {
    ...state,
    player: {
      ...state.player,
      money: state.player.money - cost,
      stores: {
        ...state.player.stores,
        seeds: state.player.stores.seeds + quantity,
      },
    },
  };
}

// ─── Governance ─────────────────────────────────────────────────────

function patrol(state: GameState, ctx: TurnContext): GameState {
  ctx.events.push('Player conducted boundary patrol');
  return {
    ...state,
    player: {
      ...state.player,
      reputation: clamp(state.player.reputation + ACTION_COSTS.PATROL_REPUTATION_BONUS, 0, 100),
    },
    communal: {
      ...state.communal,
      governance: {
        ...state.communal.governance,
        monitoringLevel: clamp(
          state.communal.governance.monitoringLevel + GOVERNANCE.MONITORING_PATROL_BONUS,
          0,
          100,
        ),
      },
    },
  };
}

function callMeeting(state: GameState, ctx: TurnContext): GameState {
  if (state.communal.governance.meetingCooldown > 0) return state;
  ctx.events.push('Community meeting called');
  return {
    ...state,
    player: {
      ...state.player,
      knowledge: clamp(state.player.knowledge + ACTION_COSTS.MEETING_KNOWLEDGE_BONUS, 0, 100),
    },
    communal: {
      ...state.communal,
      governance: {
        ...state.communal.governance,
        meetingCooldown: CALENDAR.MEETING_INTERVAL,
      },
    },
  };
}

function consultTA(state: GameState, ctx: TurnContext): GameState {
  ctx.events.push('Player consulted Traditional Authority');
  return {
    ...state,
    player: {
      ...state.player,
      reputation: clamp(state.player.reputation + 2, 0, 100),
    },
    communal: {
      ...state.communal,
      governance: {
        ...state.communal.governance,
        traditionalAuthorityRelation: clamp(
          state.communal.governance.traditionalAuthorityRelation + 5,
          0,
          100,
        ),
      },
    },
  };
}

// ─── HWC Mitigation ─────────────────────────────────────────────────

function buildChilliFence(state: GameState): GameState {
  if (state.player.money < ACTION_COSTS.CHILLI_FENCE_COST) return state;
  if (state.player.hwcMitigation.chilliFence) return state;
  return {
    ...state,
    player: {
      ...state.player,
      money: state.player.money - ACTION_COSTS.CHILLI_FENCE_COST,
      hwcMitigation: { ...state.player.hwcMitigation, chilliFence: true },
    },
  };
}

function buildNightKraal(state: GameState): GameState {
  if (state.player.money < ACTION_COSTS.NIGHT_KRAAL_COST) return state;
  if (state.player.hwcMitigation.nightKraal) return state;
  return {
    ...state,
    player: {
      ...state.player,
      money: state.player.money - ACTION_COSTS.NIGHT_KRAAL_COST,
      hwcMitigation: { ...state.player.hwcMitigation, nightKraal: true },
    },
  };
}

function setCropLayout(state: GameState): GameState {
  if (state.player.money < ACTION_COSTS.CROP_LAYOUT_COST) return state;
  if (state.player.hwcMitigation.cropLayout) return state;
  return {
    ...state,
    player: {
      ...state.player,
      money: state.player.money - ACTION_COSTS.CROP_LAYOUT_COST,
      hwcMitigation: { ...state.player.hwcMitigation, cropLayout: true },
    },
  };
}

// ─── Rest ───────────────────────────────────────────────────────────

function rest(state: GameState): GameState {
  return {
    ...state,
    player: {
      ...state.player,
      wellbeing: clamp(state.player.wellbeing + ACTION_COSTS.REST_WELLBEING_BONUS, 0, 100),
      livestock: {
        ...state.player.livestock,
        health: clamp(state.player.livestock.health + ACTION_COSTS.REST_HEALTH_BONUS, 0, 100),
      },
    },
  };
}
