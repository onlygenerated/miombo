import type { GameState } from '../GameState.js';
import type { TurnContext, NeighborTurnActions } from '../TurnContext.js';
import type { NeighborState } from '../models/Neighbor.js';
import { WOODLAND, LIVESTOCK } from '../../config.js';
import { random, randomChance } from '../utils/random.js';
import { clamp } from '../utils/clamp.js';

/**
 * Neighbor AI — decides actions for each neighbor each turn.
 *
 * Scoring: personality traits × modifiers.
 * - Desperation overrides cooperation (desperate neighbors violate more).
 * - High socialCohesion → more compliance.
 * - Greedy neighbors extract more.
 * - Cautious neighbors conserve.
 *
 * Populates ctx.neighborActions and updates neighbor desperation.
 */
export function updateNeighborAI(state: GameState, ctx: TurnContext): GameState {
  const socialCohesion = state.communal.governance.socialCohesion;
  const rules = state.communal.governance.rules;
  const hasGrazingLimit = rules.some((r) => r.type === 'grazing-limit');
  const hasWoodlandQuota = rules.some((r) => r.type === 'woodland-quota');

  const biomass = state.communal.grazing.biomass;

  const newNeighbors = state.neighbors.map((neighbor) => {
    const actions = decideActions(neighbor, state, socialCohesion, ctx);
    ctx.neighborActions.push(actions);

    // Update desperation: increases when cattle are few, decreases with wealth
    const desperationDelta = neighbor.cattle < 2 ? 5 : neighbor.cattle > 5 ? -2 : 0;
    const newDesperation = clamp(neighbor.desperation + desperationDelta, 0, 100);

    // Update compliance based on behavior
    const complianceDelta = actions.violated ? -5 : 2;
    const newCompliance = clamp(neighbor.compliance + complianceDelta, 0, 100);

    // Livestock dynamics: births and deaths
    let cattle = neighbor.cattle;

    // Births: monthly fraction of annual birth rate
    const monthlyBirthRate = LIVESTOCK.BIRTH_RATE / 12;
    for (let i = 0; i < cattle; i++) {
      if (randomChance(state.rng, monthlyBirthRate)) {
        cattle++;
        break; // Max one birth per neighbor per turn
      }
    }

    // Deaths: starvation when biomass is below threshold
    if (biomass < LIVESTOCK.STARVATION_THRESHOLD && cattle > 0) {
      const deathRate = LIVESTOCK.STARVATION_DEATH_RATE;
      for (let i = cattle - 1; i >= 0; i--) {
        if (randomChance(state.rng, deathRate)) {
          cattle--;
        }
      }
    }

    // Wealthy neighbors accumulate: positive feedback for tragedy
    if (neighbor.wealth === 'wealthy' && cattle > 0 && randomChance(state.rng, 0.02)) {
      cattle++;
    }

    return {
      ...neighbor,
      cattle: Math.max(0, cattle),
      desperation: newDesperation,
      compliance: newCompliance,
    };
  });

  // Accumulate totals for downstream systems
  for (const na of ctx.neighborActions) {
    ctx.totalWoodExtracted += na.woodExtracted;
    ctx.totalCharcoalProduced += na.charcoalProduced;
  }

  return {
    ...state,
    neighbors: newNeighbors,
  };
}

function decideActions(
  neighbor: NeighborState,
  state: GameState,
  socialCohesion: number,
  ctx: TurnContext,
): NeighborTurnActions {
  const rng = state.rng;
  const roll = random(rng);

  const { greed, caution, social } = neighbor.traits;
  const desperation = neighbor.desperation / 100;

  // ── Grazing decision ──
  // All neighbors graze by default (subsistence)
  const grazed = true;

  // ── Extraction decision ──
  // Score: greed + desperation - caution - (social × socialCohesion/100)
  const extractScore = greed + desperation - caution - social * (socialCohesion / 100);
  let woodExtracted = 0;
  let charcoalProduced = 0;

  if (extractScore + (roll - 0.5) * 0.4 > 0.3) {
    // Greedy/desperate neighbors extract more, and prefer charcoal (more valuable)
    if (greed > 0.6 || desperation > 0.7) {
      charcoalProduced = WOODLAND.CHARCOAL_EXTRACTION;
    } else {
      woodExtracted = WOODLAND.FIREWOOD_EXTRACTION;
    }
  }

  // ── Compliance decision ──
  // Violation probability: desperation × (1 - social) × (1 - socialCohesion/100)
  const rules = state.communal.governance.rules;
  const monitoringRisk = state.communal.governance.monitoringLevel / 100;
  const violationProb = desperation * (1 - social * 0.5) * (1 - monitoringRisk);
  const roll2 = random(rng);
  const violated = rules.length > 0 && roll2 < violationProb;

  let ruleViolated: string | undefined;
  if (violated && rules.length > 0) {
    // Pick the most restrictive rule to violate
    ruleViolated = rules[0].type;
  }

  return {
    neighborId: neighbor.id,
    grazed,
    woodExtracted,
    charcoalProduced,
    violated,
    ruleViolated,
  };
}
