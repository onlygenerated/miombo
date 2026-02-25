// ─── Farm Actions ────────────────────────────────────────────────────
export interface PrepareFieldAction {
  type: 'prepare-field';
  fieldId: number;
}

export interface PlantCropsAction {
  type: 'plant-crops';
  fieldId: number;
}

export interface TendCropsAction {
  type: 'tend-crops';
  fieldId: number;
}

export interface HarvestAction {
  type: 'harvest';
  fieldId: number;
}

// ─── Livestock Actions ──────────────────────────────────────────────
export interface GrazeCattleAction {
  type: 'graze-cattle';
}

export interface BuyCattleAction {
  type: 'buy-cattle';
  quantity: number;
}

export interface SellCattleAction {
  type: 'sell-cattle';
  quantity: number;
}

// ─── Woodland Actions ───────────────────────────────────────────────
export interface CollectFirewoodAction {
  type: 'collect-firewood';
}

export interface ProduceCharcoalAction {
  type: 'produce-charcoal';
}

// ─── Market Actions ─────────────────────────────────────────────────
export interface SellGoodsAction {
  type: 'sell-goods';
  commodity: 'maize' | 'firewood' | 'charcoal' | 'milk' | 'manure';
  quantity: number;
}

export interface BuySeedsAction {
  type: 'buy-seeds';
  quantity: number;
}

// ─── Governance Actions ─────────────────────────────────────────────
export interface PatrolAction {
  type: 'patrol';
}

export interface CallMeetingAction {
  type: 'call-meeting';
}

export interface ConsultTAAction {
  type: 'consult-ta';
}

// ─── HWC Mitigation ─────────────────────────────────────────────────
export interface BuildChilliFenceAction {
  type: 'build-chilli-fence';
}

export interface BuildNightKraalAction {
  type: 'build-night-kraal';
}

export interface SetCropLayoutAction {
  type: 'set-crop-layout';
}

// ─── Rest ───────────────────────────────────────────────────────────
export interface RestAction {
  type: 'rest';
}

/**
 * Discriminated union of all player action types.
 * Each turn the player picks up to ACTIONS_PER_TURN actions.
 */
export type PlayerAction =
  | PrepareFieldAction
  | PlantCropsAction
  | TendCropsAction
  | HarvestAction
  | GrazeCattleAction
  | BuyCattleAction
  | SellCattleAction
  | CollectFirewoodAction
  | ProduceCharcoalAction
  | SellGoodsAction
  | BuySeedsAction
  | PatrolAction
  | CallMeetingAction
  | ConsultTAAction
  | BuildChilliFenceAction
  | BuildNightKraalAction
  | SetCropLayoutAction
  | RestAction;
