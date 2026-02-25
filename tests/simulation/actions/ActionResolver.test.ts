import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../../src/simulation/GameState.js';
import { resolveActions } from '../../../src/simulation/actions/ActionResolver.js';
import { createTurnContext } from '../../../src/simulation/TurnContext.js';
import { ACTION_COSTS, CROP, WOODLAND, GOVERNANCE } from '../../../src/config.js';
import type { PlayerAction } from '../../../src/simulation/actions/PlayerAction.js';

function resolve(actions: PlayerAction[], seed = 42) {
  const state = createInitialState(seed);
  const ctx = createTurnContext(actions);
  const result = resolveActions(state, actions, ctx);
  return { state, result, ctx };
}

describe('ActionResolver', () => {
  // ─── Field Actions ──────────────────────────────────────────────

  describe('prepare-field', () => {
    it('transitions fallow field to prepared', () => {
      const { result } = resolve([{ type: 'prepare-field', fieldId: 0 }]);
      expect(result.player.fields[0].stage).toBe('prepared');
      expect(result.player.fields[0].monthsInStage).toBe(0);
    });

    it('ignores non-fallow fields', () => {
      const { state } = resolve([]);
      const prepared = {
        ...state,
        player: {
          ...state.player,
          fields: state.player.fields.map((f) =>
            f.id === 0 ? { ...f, stage: 'prepared' as const } : f,
          ),
        },
      };
      const ctx = createTurnContext([]);
      const result = resolveActions(prepared, [{ type: 'prepare-field', fieldId: 0 }], ctx);
      expect(result.player.fields[0].stage).toBe('prepared');
    });
  });

  describe('plant-crops', () => {
    it('transitions prepared to planted and consumes seeds', () => {
      const state = createInitialState(42);
      const prepState = {
        ...state,
        player: {
          ...state.player,
          fields: state.player.fields.map((f) =>
            f.id === 0 ? { ...f, stage: 'prepared' as const } : f,
          ),
        },
      };
      const ctx = createTurnContext([]);
      const result = resolveActions(prepState, [{ type: 'plant-crops', fieldId: 0 }], ctx);
      expect(result.player.fields[0].stage).toBe('planted');
      expect(result.player.stores.seeds).toBe(
        state.player.stores.seeds - ACTION_COSTS.SEEDS_PER_PLANT,
      );
    });

    it('fails without enough seeds', () => {
      const state = createInitialState(42);
      const noSeeds = {
        ...state,
        player: {
          ...state.player,
          stores: { ...state.player.stores, seeds: 0 },
          fields: state.player.fields.map((f) =>
            f.id === 0 ? { ...f, stage: 'prepared' as const } : f,
          ),
        },
      };
      const ctx = createTurnContext([]);
      const result = resolveActions(noSeeds, [{ type: 'plant-crops', fieldId: 0 }], ctx);
      expect(result.player.fields[0].stage).toBe('prepared');
    });
  });

  describe('tend-crops', () => {
    it('boosts field health', () => {
      const state = createInitialState(42);
      const growingState = {
        ...state,
        player: {
          ...state.player,
          fields: state.player.fields.map((f) =>
            f.id === 0 ? { ...f, stage: 'growing' as const, health: 70 } : f,
          ),
        },
      };
      const ctx = createTurnContext([]);
      const result = resolveActions(growingState, [{ type: 'tend-crops', fieldId: 0 }], ctx);
      expect(result.player.fields[0].health).toBe(70 + ACTION_COSTS.TEND_CROPS_BONUS);
    });

    it('clamps health to 100', () => {
      const state = createInitialState(42);
      const healthy = {
        ...state,
        player: {
          ...state.player,
          fields: state.player.fields.map((f) =>
            f.id === 0 ? { ...f, stage: 'growing' as const, health: 95 } : f,
          ),
        },
      };
      const ctx = createTurnContext([]);
      const result = resolveActions(healthy, [{ type: 'tend-crops', fieldId: 0 }], ctx);
      expect(result.player.fields[0].health).toBe(100);
    });
  });

  describe('harvest', () => {
    it('harvests ready field and adds grain', () => {
      const state = createInitialState(42);
      const readyState = {
        ...state,
        player: {
          ...state.player,
          fields: state.player.fields.map((f) =>
            f.id === 0 ? { ...f, stage: 'ready' as const, health: 80 } : f,
          ),
        },
      };
      const ctx = createTurnContext([]);
      const result = resolveActions(readyState, [{ type: 'harvest', fieldId: 0 }], ctx);
      expect(result.player.fields[0].stage).toBe('fallow');
      const expectedYield = Math.round(CROP.BASE_YIELD * 0.8);
      expect(result.player.stores.grain).toBe(state.player.stores.grain + expectedYield);
    });
  });

  // ─── Livestock ──────────────────────────────────────────────────

  describe('graze-cattle', () => {
    it('boosts cattle health', () => {
      const { state, result, ctx } = resolve([{ type: 'graze-cattle' }]);
      expect(result.player.livestock.health).toBe(
        state.player.livestock.health + ACTION_COSTS.GRAZE_HEALTH_BONUS,
      );
      expect(ctx.events.length).toBeGreaterThan(0);
    });
  });

  describe('buy-cattle', () => {
    it('buys cattle and deducts money', () => {
      const { state, result } = resolve([{ type: 'buy-cattle', quantity: 1 }]);
      expect(result.player.livestock.cattle).toBe(state.player.livestock.cattle + 1);
      expect(result.player.money).toBeLessThan(state.player.money);
    });

    it('fails with insufficient money', () => {
      const state = createInitialState(42);
      const broke = { ...state, player: { ...state.player, money: 0 } };
      const ctx = createTurnContext([]);
      const result = resolveActions(broke, [{ type: 'buy-cattle', quantity: 1 }], ctx);
      expect(result.player.livestock.cattle).toBe(state.player.livestock.cattle);
    });
  });

  describe('sell-cattle', () => {
    it('sells cattle and adds money', () => {
      const { state, result } = resolve([{ type: 'sell-cattle', quantity: 1 }]);
      expect(result.player.livestock.cattle).toBe(state.player.livestock.cattle - 1);
      expect(result.player.money).toBeGreaterThan(state.player.money);
    });

    it('fails with insufficient cattle', () => {
      const { state, result } = resolve([{ type: 'sell-cattle', quantity: 100 }]);
      expect(result.player.livestock.cattle).toBe(state.player.livestock.cattle);
    });
  });

  // ─── Woodland ───────────────────────────────────────────────────

  describe('collect-firewood', () => {
    it('adds firewood and reduces woodland density', () => {
      const { state, result, ctx } = resolve([{ type: 'collect-firewood' }]);
      expect(result.player.stores.firewood).toBe(
        state.player.stores.firewood + ACTION_COSTS.FIREWOOD_YIELD,
      );
      expect(result.communal.woodland.density).toBe(
        state.communal.woodland.density - WOODLAND.FIREWOOD_EXTRACTION,
      );
      expect(ctx.totalWoodExtracted).toBe(WOODLAND.FIREWOOD_EXTRACTION);
    });
  });

  describe('produce-charcoal', () => {
    it('adds charcoal and reduces density more', () => {
      const { state, result, ctx } = resolve([{ type: 'produce-charcoal' }]);
      expect(result.player.stores.charcoal).toBe(
        state.player.stores.charcoal + ACTION_COSTS.CHARCOAL_YIELD,
      );
      expect(result.communal.woodland.density).toBe(
        state.communal.woodland.density - WOODLAND.CHARCOAL_EXTRACTION,
      );
      expect(ctx.totalCharcoalProduced).toBe(WOODLAND.CHARCOAL_EXTRACTION);
    });
  });

  // ─── Market ─────────────────────────────────────────────────────

  describe('sell-goods', () => {
    it('sells grain (maize) for money', () => {
      const { state, result } = resolve([
        { type: 'sell-goods', commodity: 'maize', quantity: 5 },
      ]);
      expect(result.player.stores.grain).toBe(state.player.stores.grain - 5);
      expect(result.player.money).toBeGreaterThan(state.player.money);
    });

    it('fails with insufficient stock', () => {
      const { state, result } = resolve([
        { type: 'sell-goods', commodity: 'maize', quantity: 9999 },
      ]);
      expect(result.player.stores.grain).toBe(state.player.stores.grain);
    });
  });

  describe('buy-seeds', () => {
    it('buys seeds', () => {
      const { state, result } = resolve([{ type: 'buy-seeds', quantity: 5 }]);
      expect(result.player.stores.seeds).toBe(state.player.stores.seeds + 5);
      expect(result.player.money).toBeLessThan(state.player.money);
    });
  });

  // ─── Governance ─────────────────────────────────────────────────

  describe('patrol', () => {
    it('boosts monitoring and reputation', () => {
      const { state, result } = resolve([{ type: 'patrol' }]);
      expect(result.communal.governance.monitoringLevel).toBeGreaterThan(
        state.communal.governance.monitoringLevel,
      );
      expect(result.player.reputation).toBeGreaterThan(state.player.reputation);
    });
  });

  describe('call-meeting', () => {
    it('sets meeting cooldown and boosts knowledge', () => {
      const { state, result } = resolve([{ type: 'call-meeting' }]);
      expect(result.communal.governance.meetingCooldown).toBe(3);
      expect(result.player.knowledge).toBeGreaterThan(state.player.knowledge);
    });

    it('fails when cooldown active', () => {
      const state = createInitialState(42);
      const cooldown = {
        ...state,
        communal: {
          ...state.communal,
          governance: { ...state.communal.governance, meetingCooldown: 2 },
        },
      };
      const ctx = createTurnContext([]);
      const result = resolveActions(cooldown, [{ type: 'call-meeting' }], ctx);
      expect(result.communal.governance.meetingCooldown).toBe(2);
    });
  });

  describe('consult-ta', () => {
    it('boosts TA relation and reputation', () => {
      const { state, result } = resolve([{ type: 'consult-ta' }]);
      expect(result.communal.governance.traditionalAuthorityRelation).toBeGreaterThan(
        state.communal.governance.traditionalAuthorityRelation,
      );
      expect(result.player.reputation).toBeGreaterThan(state.player.reputation);
    });
  });

  // ─── HWC Mitigation ────────────────────────────────────────────

  describe('build-chilli-fence', () => {
    it('builds fence and deducts money', () => {
      const { result } = resolve([{ type: 'build-chilli-fence' }]);
      expect(result.player.hwcMitigation.chilliFence).toBe(true);
      expect(result.player.money).toBeLessThan(500000);
    });

    it('idempotent — does not charge twice', () => {
      const state = createInitialState(42);
      const hasFence = {
        ...state,
        player: {
          ...state.player,
          hwcMitigation: { ...state.player.hwcMitigation, chilliFence: true },
        },
      };
      const ctx = createTurnContext([]);
      const result = resolveActions(hasFence, [{ type: 'build-chilli-fence' }], ctx);
      expect(result.player.money).toBe(state.player.money);
    });
  });

  // ─── Rest ───────────────────────────────────────────────────────

  describe('rest', () => {
    it('boosts wellbeing and livestock health', () => {
      const { state, result } = resolve([{ type: 'rest' }]);
      expect(result.player.wellbeing).toBe(
        state.player.wellbeing + ACTION_COSTS.REST_WELLBEING_BONUS,
      );
      expect(result.player.livestock.health).toBe(
        state.player.livestock.health + ACTION_COSTS.REST_HEALTH_BONUS,
      );
    });
  });

  // ─── Multiple Actions ──────────────────────────────────────────

  describe('multiple actions per turn', () => {
    it('resolves two actions sequentially', () => {
      const { state, result } = resolve([
        { type: 'prepare-field', fieldId: 0 },
        { type: 'rest' },
      ]);
      expect(result.player.fields[0].stage).toBe('prepared');
      expect(result.player.wellbeing).toBe(
        state.player.wellbeing + ACTION_COSTS.REST_WELLBEING_BONUS,
      );
    });
  });
});
