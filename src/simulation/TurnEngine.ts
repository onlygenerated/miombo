import type { GameState } from './GameState.js';
import type { PlayerAction } from './actions/PlayerAction.js';
import { createTurnContext } from './TurnContext.js';
import { getSeasonForMonth } from './models/Season.js';
import { CALENDAR, GENERATION } from '../config.js';
import { clamp } from './utils/clamp.js';

// Systems — imported in pipeline order
import { updateWeather } from './systems/WeatherSystem.js';
import { resolveActions } from './actions/ActionResolver.js';
import { updateNeighborAI } from './systems/NeighborAISystem.js';
import { updateCrops } from './systems/CropSystem.js';
import { updateLivestock } from './systems/LivestockSystem.js';
import { updateGrazing } from './systems/GrazingSystem.js';
import { updateWoodland } from './systems/WoodlandSystem.js';
import { updateWildlife } from './systems/WildlifeSystem.js';
import { updateEconomy } from './systems/EconomySystem.js';
import { updateGovernance } from './systems/GovernanceSystem.js';
import { updateEvents } from './systems/EventSystem.js';

/**
 * Process a single turn — the core game loop orchestrator.
 *
 * Pipeline order:
 * 1. Weather       → rainfall, drought
 * 2. ActionResolver → player immediate effects
 * 3. NeighborAI    → AI decisions, populate ctx totals
 * 4. Resolution:
 *    a. CropSystem       → field progression
 *    b. LivestockSystem  → births, deaths, production
 *    c. GrazingSystem    → logistic growth, overgrazing
 *    d. WoodlandSystem   → regen, extraction
 *    e. WildlifeSystem   → HWC events
 *    f. EconomySystem    → price variation
 *    g. GovernanceSystem → trust, monitoring, sanctions
 * 5. EventSystem   → trigger-based narrative events
 * 6. Calendar      → advance turn/month/year/season/chapter
 */
export function processTurn(state: GameState, playerActions: PlayerAction[]): GameState {
  const ctx = createTurnContext(playerActions);

  // 1. Weather
  let s = updateWeather(state);

  // 2. Player actions (immediate effects)
  s = resolveActions(s, playerActions, ctx);

  // 3. Neighbor AI
  s = updateNeighborAI(s, ctx);

  // 4. Resolution phase
  s = updateCrops(s);
  s = updateLivestock(s, ctx);
  s = updateGrazing(s, ctx);
  s = updateWoodland(s, ctx);
  s = updateWildlife(s, ctx);
  s = updateEconomy(s);
  s = updateGovernance(s, ctx);

  // 5. Events
  s = updateEvents(s, ctx);

  // 6. Calendar advance
  s = advanceCalendar(s);

  return s;
}

/**
 * Advance the calendar: turn, month, season, year, chapter.
 */
export function advanceCalendar(state: GameState): GameState {
  const cal = state.calendar;
  const gen = state.generation;

  const newTurn = cal.turn + 1;

  // Advance month (wraps 12 → 1)
  let newMonth = cal.month + 1;
  let newYear = cal.year;
  let newYearsInChapter = gen.yearsInChapter;

  if (newMonth > 12) {
    newMonth = 1;
    newYear = cal.year + 1;
    newYearsInChapter = gen.yearsInChapter + 1;
  }

  const newSeason = getSeasonForMonth(newMonth);

  // Chapter-end check (every 144 turns)
  let newState: GameState = {
    ...state,
    calendar: {
      ...cal,
      turn: newTurn,
      month: newMonth,
      year: newYear,
      season: newSeason,
    },
    generation: {
      ...gen,
      yearsInChapter: newYearsInChapter,
    },
  };

  if (newTurn > 0 && newTurn % CALENDAR.TURNS_PER_CHAPTER === 0) {
    newState = applyInheritance(newState);
  }

  return newState;
}

/**
 * Chapter-end inheritance: next generation receives fraction of parent's assets.
 * Cattle × 0.7, money × 0.5, knowledge × 0.75, reputation × 0.5.
 * Also simulates population pressure (neighbor cattle +15%) and
 * governance weakening (trust/cohesion -15%, compliance -20%).
 */
export function applyInheritance(state: GameState): GameState {
  const player = state.player;
  const gen = state.generation;

  const cattleInherited = Math.round(player.livestock.cattle * GENERATION.CATTLE_INHERITANCE);
  const moneyInherited = Math.round(player.money * GENERATION.MONEY_INHERITANCE);
  const knowledgeInherited = Math.round(player.knowledge * GENERATION.KNOWLEDGE_INHERITANCE);
  const reputationInherited = Math.round(player.reputation * GENERATION.REPUTATION_INHERITANCE);

  // Population pressure: neighbor cattle grow ~15%
  const newNeighbors = state.neighbors.map(n => ({
    ...n,
    cattle: Math.round(n.cattle * 1.15),
    // Compliance erodes across generations — institutions don't auto-survive
    compliance: clamp(Math.round(n.compliance * 0.8), 0, 100),
  }));

  // Governance weakening across generational transition
  const gov = state.communal.governance;
  const newTrust = clamp(Math.round(gov.communityTrust * 0.85), 0, 100);
  const newCohesion = clamp(Math.round(gov.socialCohesion * 0.85), 0, 100);
  const weakenedRules = gov.rules.map(r => ({
    ...r,
    compliance: clamp(Math.round(r.compliance * 0.8), 0, 100),
  }));

  return {
    ...state,
    player: {
      ...player,
      livestock: {
        ...player.livestock,
        cattle: cattleInherited,
      },
      money: moneyInherited,
      knowledge: clamp(knowledgeInherited, 0, 100),
      reputation: clamp(reputationInherited, 0, 100),
    },
    neighbors: newNeighbors,
    communal: {
      ...state.communal,
      governance: {
        ...gov,
        communityTrust: newTrust,
        socialCohesion: newCohesion,
        rules: weakenedRules,
      },
    },
    generation: {
      chapter: gen.chapter + 1,
      yearsInChapter: 0,
      inheritance: {
        cattleInherited,
        moneyInherited,
        knowledgeInherited,
        reputationInherited,
        landHealthAtTransition: state.communal.grazing.health,
      },
    },
  };
}
