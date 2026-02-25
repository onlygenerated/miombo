import type { PlayerAction } from './actions/PlayerAction.js';

/** Actions chosen by a single neighbor this turn. */
export interface NeighborTurnActions {
  neighborId: string;
  grazed: boolean;
  woodExtracted: number;   // density points of firewood
  charcoalProduced: number; // density points of charcoal
  violated: boolean;        // broke a community rule
  ruleViolated?: string;    // which rule was broken
}

/**
 * Ephemeral mutable struct built by TurnEngine during processTurn().
 * Shared across systems so they can see "what happened this turn".
 * NOT serialized to GameState.
 */
export interface TurnContext {
  playerActions: PlayerAction[];
  neighborActions: NeighborTurnActions[];
  totalCattleOnCommons: number;
  totalWoodExtracted: number;
  totalCharcoalProduced: number;
  events: string[];
}

/** Create a fresh TurnContext for a new turn. */
export function createTurnContext(playerActions: PlayerAction[] = []): TurnContext {
  return {
    playerActions,
    neighborActions: [],
    totalCattleOnCommons: 0,
    totalWoodExtracted: 0,
    totalCharcoalProduced: 0,
    events: [],
  };
}
