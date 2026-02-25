import Phaser from 'phaser';
import { SCENE_KEYS } from './SceneKeys.js';
import { UI_COLORS } from '../rendering/colors.js';
import { ResourceBar } from '../ui/ResourceBar.js';
import { formatMoney, formatMonth, formatSeason, healthToColor } from '../rendering/StateRenderer.js';
import type { GameState } from '../simulation/GameState.js';

/**
 * Overlay HUD scene — launched parallel on top of GameScene.
 * Top bar: month, season, money.
 * Resource row: cattle, grain, wellbeing.
 * No interactivity (pure display).
 */
export class HUDScene extends Phaser.Scene {
  private monthText!: Phaser.GameObjects.Text;
  private seasonText!: Phaser.GameObjects.Text;
  private droughtText!: Phaser.GameObjects.Text;
  private moneyBar!: ResourceBar;
  private cattleBar!: ResourceBar;
  private grainBar!: ResourceBar;
  private wellbeingBar!: ResourceBar;
  private grazingBar!: ResourceBar;
  private woodlandBar!: ResourceBar;

  constructor() {
    super({ key: SCENE_KEYS.HUD });
  }

  create(data: { state: GameState }): void {
    // Top bar background
    this.add.rectangle(160, 22, 320, 44, UI_COLORS.BG_DARK, 0.85).setOrigin(0.5);

    // Month + Season (top-left)
    this.monthText = this.add.text(6, 6, '', {
      fontSize: '13px', color: '#ffffff', fontFamily: 'sans-serif', fontStyle: 'bold',
    });
    this.seasonText = this.add.text(6, 22, '', {
      fontSize: '10px', color: '#aaaaaa', fontFamily: 'sans-serif',
    });

    // Drought warning
    this.droughtText = this.add.text(160, 14, '', {
      fontSize: '11px', color: '#FF4444', fontFamily: 'sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5);

    // Money (top-right)
    this.moneyBar = new ResourceBar({ scene: this, x: 230, y: 14, icon: '\uD83D\uDCB0', value: 0 });

    // Resource row (below top bar, at y=38)
    this.cattleBar = new ResourceBar({ scene: this, x: 6, y: 38, icon: '\uD83D\uDC02', value: 0, fontSize: 10 });
    this.grainBar = new ResourceBar({ scene: this, x: 70, y: 38, icon: '\uD83C\uDF3E', value: 0, fontSize: 10 });
    this.wellbeingBar = new ResourceBar({ scene: this, x: 130, y: 38, icon: '\u2764\uFE0F', value: 0, fontSize: 10 });
    this.grazingBar = new ResourceBar({ scene: this, x: 195, y: 38, icon: '\uD83C\uDF3F', value: 0, fontSize: 10 });
    this.woodlandBar = new ResourceBar({ scene: this, x: 255, y: 38, icon: '\uD83C\uDF32', value: 0, fontSize: 10 });

    if (data?.state) {
      this.updateState(data.state);
    }
  }

  updateState(state: GameState): void {
    const cal = state.calendar;
    const p = state.player;

    this.monthText.setText(`Y${cal.year} ${formatMonth(cal.month)}`);
    this.seasonText.setText(formatSeason(cal.season));
    this.droughtText.setText(cal.drought ? 'DROUGHT' : '');

    this.moneyBar.setValue(formatMoney(p.money));
    this.cattleBar.setValue(p.livestock.cattle);
    this.grainBar.setValue(p.stores.grain);
    this.wellbeingBar.setValue(p.wellbeing);
    this.grazingBar.setValue(`${Math.round(state.communal.grazing.health)}%`);
    this.woodlandBar.setValue(`${Math.round(state.communal.woodland.density)}%`);
  }
}
