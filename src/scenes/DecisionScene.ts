import Phaser from 'phaser';
import { SCENE_KEYS } from './SceneKeys.js';
import { UI_COLORS } from '../rendering/colors.js';
import { Button } from '../ui/Button.js';
import { Card } from '../ui/Card.js';
import { I18n } from '../i18n/I18n.js';
import { K } from '../i18n/keys.js';
import type { GameState } from '../simulation/GameState.js';
import type { PlayerAction } from '../simulation/actions/PlayerAction.js';
import { processTurn } from '../simulation/TurnEngine.js';
import { saveGame } from '../persistence/SaveManager.js';
import { PLAYER, ACTION_COSTS } from '../config.js';

interface ActionDef {
  action: PlayerAction;
  nameKey: string;
  descKey: string;
  icon: string;
  category: string;
}

/**
 * Action card selection scene.
 * Player picks up to ACTIONS_PER_TURN (2) actions, then confirms.
 */
export class DecisionScene extends Phaser.Scene {
  private selectedActions: ActionDef[] = [];
  private cards: Card[] = [];
  private confirmBtn!: Button;
  private remainingText!: Phaser.GameObjects.Text;
  private gameState!: GameState;

  constructor() {
    super({ key: SCENE_KEYS.DECISION });
  }

  create(data: { state: GameState }): void {
    this.gameState = data.state;
    this.selectedActions = [];
    this.cards = [];

    this.cameras.main.setBackgroundColor(UI_COLORS.BG_DARK);

    // Title
    this.add.text(160, 18, I18n.t(K.UI_SELECT_ACTIONS), {
      fontSize: '16px', color: '#ffffff', fontFamily: 'sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Remaining actions indicator
    this.remainingText = this.add.text(160, 38, '', {
      fontSize: '11px', color: '#aaaaaa', fontFamily: 'sans-serif',
    }).setOrigin(0.5);
    this.updateRemainingText();

    // Build available action list
    const available = this.getAvailableActions();

    // Scrollable card area
    const startY = 58;
    const cardW = 145;
    const cardH = 44;
    const gapX = 8;
    const gapY = 6;
    const cols = 2;

    available.forEach((def, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 6 + col * (cardW + gapX) + cardW / 2;
      const y = startY + row * (cardH + gapY) + cardH / 2;

      if (y + cardH / 2 > 420) return; // Don't overflow past buttons

      const card = new Card({
        scene: this,
        x, y,
        width: cardW,
        height: cardH,
        title: I18n.t(def.nameKey),
        icon: def.icon,
        description: I18n.t(def.descKey),
        category: def.category,
        callback: () => this.toggleCard(i, def),
      });

      this.cards.push(card);
    });

    // Confirm button
    this.confirmBtn = new Button({
      scene: this,
      x: 110, y: 450,
      width: 130, height: 36,
      label: I18n.t(K.UI_CONFIRM),
      callback: () => this.confirmTurn(),
    });
    this.confirmBtn.setEnabled(false);

    // Back button
    new Button({
      scene: this,
      x: 250, y: 450,
      width: 80, height: 36,
      label: I18n.t(K.UI_BACK),
      color: 0x37474F,
      callback: () => {
        this.scene.stop();
        this.scene.resume(SCENE_KEYS.GAME);
      },
    });
  }

  private toggleCard(index: number, def: ActionDef): void {
    const card = this.cards[index];
    if (!card) return;

    if (card.selected) {
      // Deselect
      card.setSelected(false);
      this.selectedActions = this.selectedActions.filter(a => a !== def);
    } else if (this.selectedActions.length < PLAYER.ACTIONS_PER_TURN) {
      // Select
      card.setSelected(true);
      this.selectedActions.push(def);
    }

    this.confirmBtn.setEnabled(this.selectedActions.length > 0);
    this.updateRemainingText();
  }

  private updateRemainingText(): void {
    const remaining = PLAYER.ACTIONS_PER_TURN - this.selectedActions.length;
    this.remainingText.setText(I18n.t(K.UI_ACTIONS_REMAINING, remaining));
  }

  private confirmTurn(): void {
    if (this.selectedActions.length === 0) return;

    const actions: PlayerAction[] = this.selectedActions.map(d => d.action);
    const prevState = this.gameState;
    const newState = processTurn(this.gameState, actions);
    saveGame(newState);

    // Close decision scene and signal GameScene
    this.scene.stop();
    const gameScene = this.scene.get(SCENE_KEYS.GAME);
    gameScene.scene.resume();
    gameScene.events.emit('turn-processed', newState, prevState);
  }

  private getAvailableActions(): ActionDef[] {
    const s = this.gameState;
    const p = s.player;
    const defs: ActionDef[] = [];

    // Farm actions — target first eligible field
    const fallowField = p.fields.find(f => f.stage === 'fallow');
    if (fallowField) {
      defs.push({
        action: { type: 'prepare-field', fieldId: fallowField.id },
        nameKey: K.ACT_PREPARE_FIELD, descKey: K.DESC_PREPARE_FIELD,
        icon: '\uD83D\uDEA7', category: 'farm',
      });
    }

    const preparedField = p.fields.find(f => f.stage === 'prepared');
    if (preparedField && p.stores.seeds >= ACTION_COSTS.SEEDS_PER_PLANT) {
      defs.push({
        action: { type: 'plant-crops', fieldId: preparedField.id },
        nameKey: K.ACT_PLANT_CROPS, descKey: K.DESC_PLANT_CROPS,
        icon: '\uD83C\uDF31', category: 'farm',
      });
    }

    const growingField = p.fields.find(f => f.stage === 'planted' || f.stage === 'growing');
    if (growingField) {
      defs.push({
        action: { type: 'tend-crops', fieldId: growingField.id },
        nameKey: K.ACT_TEND_CROPS, descKey: K.DESC_TEND_CROPS,
        icon: '\uD83D\uDCA7', category: 'farm',
      });
    }

    const readyField = p.fields.find(f => f.stage === 'ready');
    if (readyField) {
      defs.push({
        action: { type: 'harvest', fieldId: readyField.id },
        nameKey: K.ACT_HARVEST, descKey: K.DESC_HARVEST,
        icon: '\uD83C\uDF3E', category: 'farm',
      });
    }

    // Livestock
    if (p.livestock.cattle > 0) {
      defs.push({
        action: { type: 'graze-cattle' },
        nameKey: K.ACT_GRAZE_CATTLE, descKey: K.DESC_GRAZE_CATTLE,
        icon: '\uD83D\uDC02', category: 'livestock',
      });
    }

    if (p.money >= s.economy.prices.cattle) {
      defs.push({
        action: { type: 'buy-cattle', quantity: 1 },
        nameKey: K.ACT_BUY_CATTLE, descKey: K.DESC_BUY_CATTLE,
        icon: '\uD83D\uDED2', category: 'livestock',
      });
    }

    if (p.livestock.cattle > 0) {
      defs.push({
        action: { type: 'sell-cattle', quantity: 1 },
        nameKey: K.ACT_SELL_CATTLE, descKey: K.DESC_SELL_CATTLE,
        icon: '\uD83D\uDCB5', category: 'livestock',
      });
    }

    // Woodland
    if (s.communal.woodland.density > 0) {
      defs.push({
        action: { type: 'collect-firewood' },
        nameKey: K.ACT_COLLECT_FIREWOOD, descKey: K.DESC_COLLECT_FIREWOOD,
        icon: '\uD83E\uDE93', category: 'woodland',
      });
      defs.push({
        action: { type: 'produce-charcoal' },
        nameKey: K.ACT_PRODUCE_CHARCOAL, descKey: K.DESC_PRODUCE_CHARCOAL,
        icon: '\u2B1B', category: 'woodland',
      });
    }

    // Market — sell first available commodity
    const sellable: Array<{ commodity: 'maize' | 'firewood' | 'charcoal' | 'milk' | 'manure'; store: number }> = [
      { commodity: 'maize', store: p.stores.grain },
      { commodity: 'firewood', store: p.stores.firewood },
      { commodity: 'charcoal', store: p.stores.charcoal },
      { commodity: 'milk', store: p.stores.milk },
      { commodity: 'manure', store: p.stores.manure },
    ];
    const hasSellable = sellable.find(c => c.store > 0);
    if (hasSellable) {
      defs.push({
        action: { type: 'sell-goods', commodity: hasSellable.commodity, quantity: 1 },
        nameKey: K.ACT_SELL_GOODS, descKey: K.DESC_SELL_GOODS,
        icon: '\uD83C\uDFEA', category: 'market',
      });
    }

    if (p.money >= s.economy.prices.seeds) {
      defs.push({
        action: { type: 'buy-seeds', quantity: 1 },
        nameKey: K.ACT_BUY_SEEDS, descKey: K.DESC_BUY_SEEDS,
        icon: '\uD83C\uDF30', category: 'market',
      });
    }

    // Governance
    defs.push({
      action: { type: 'patrol' },
      nameKey: K.ACT_PATROL, descKey: K.DESC_PATROL,
      icon: '\uD83D\uDC41\uFE0F', category: 'governance',
    });

    if (s.communal.governance.meetingCooldown === 0) {
      defs.push({
        action: { type: 'call-meeting' },
        nameKey: K.ACT_CALL_MEETING, descKey: K.DESC_CALL_MEETING,
        icon: '\uD83D\uDCE2', category: 'governance',
      });
    }

    defs.push({
      action: { type: 'consult-ta' },
      nameKey: K.ACT_CONSULT_TA, descKey: K.DESC_CONSULT_TA,
      icon: '\uD83D\uDC51', category: 'governance',
    });

    // HWC mitigation (one-time purchases)
    if (!p.hwcMitigation.chilliFence && p.money >= ACTION_COSTS.CHILLI_FENCE_COST) {
      defs.push({
        action: { type: 'build-chilli-fence' },
        nameKey: K.ACT_BUILD_CHILLI_FENCE, descKey: K.DESC_BUILD_CHILLI_FENCE,
        icon: '\uD83C\uDF36\uFE0F', category: 'hwc',
      });
    }

    if (!p.hwcMitigation.nightKraal && p.money >= ACTION_COSTS.NIGHT_KRAAL_COST) {
      defs.push({
        action: { type: 'build-night-kraal' },
        nameKey: K.ACT_BUILD_NIGHT_KRAAL, descKey: K.DESC_BUILD_NIGHT_KRAAL,
        icon: '\uD83C\uDF19', category: 'hwc',
      });
    }

    if (!p.hwcMitigation.cropLayout && p.money >= ACTION_COSTS.CROP_LAYOUT_COST) {
      defs.push({
        action: { type: 'set-crop-layout' },
        nameKey: K.ACT_SET_CROP_LAYOUT, descKey: K.DESC_SET_CROP_LAYOUT,
        icon: '\uD83D\uDDFA\uFE0F', category: 'hwc',
      });
    }

    // Rest — always available
    defs.push({
      action: { type: 'rest' },
      nameKey: K.ACT_REST, descKey: K.DESC_REST,
      icon: '\uD83D\uDCA4', category: 'rest',
    });

    return defs;
  }
}
