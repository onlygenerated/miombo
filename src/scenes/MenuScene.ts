import Phaser from 'phaser';
import { SCENE_KEYS } from './SceneKeys.js';
import { I18n } from '../i18n/I18n.js';
import { K } from '../i18n/keys.js';
import { Button } from '../ui/Button.js';
import { hasSave, loadGame, deleteSave } from '../persistence/SaveManager.js';
import { createInitialState } from '../simulation/GameState.js';
import { UI_COLORS } from '../rendering/colors.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.MENU });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(UI_COLORS.BG_DARK);

    // Title
    this.add.text(160, 120, I18n.t(K.UI_TITLE), {
      fontSize: '36px',
      color: '#4CAF50',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(160, 160, I18n.t(K.UI_SUBTITLE), {
      fontSize: '12px',
      color: '#aaaaaa',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    // New Game button
    new Button({
      scene: this,
      x: 160, y: 260,
      width: 200, height: 44,
      label: I18n.t(K.UI_NEW_GAME),
      callback: () => {
        deleteSave();
        const state = createInitialState(Date.now());
        this.scene.start(SCENE_KEYS.GAME, { state });
      },
    });

    // Continue button (only if save exists)
    if (hasSave()) {
      new Button({
        scene: this,
        x: 160, y: 320,
        width: 200, height: 44,
        label: I18n.t(K.UI_CONTINUE_GAME),
        color: 0x37474F,
        callback: () => {
          const state = loadGame();
          if (state) {
            this.scene.start(SCENE_KEYS.GAME, { state });
          }
        },
      });
    }
  }
}
