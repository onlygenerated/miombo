import Phaser from 'phaser';
import { SCENE_KEYS } from './SceneKeys.js';
import { UI_COLORS } from '../rendering/colors.js';
import { Button } from '../ui/Button.js';
import { I18n } from '../i18n/I18n.js';
import { K } from '../i18n/keys.js';
import { deleteSave } from '../persistence/SaveManager.js';
import { createInitialState } from '../simulation/GameState.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.GAME_OVER });
  }

  create(data: { complete?: boolean }): void {
    this.cameras.main.setBackgroundColor(UI_COLORS.BG_DARK);

    const isComplete = data?.complete ?? false;
    const title = isComplete ? I18n.t(K.UI_GAME_COMPLETE) : I18n.t(K.UI_GAME_OVER);
    const msg = isComplete ? I18n.t(K.UI_GAME_COMPLETE_MSG) : I18n.t(K.UI_GAME_OVER_MSG);
    const titleColor = isComplete ? '#4CAF50' : '#FF4444';

    this.add.text(160, 140, title, {
      fontSize: '28px',
      color: titleColor,
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(160, 200, msg, {
      fontSize: '12px',
      color: '#cccccc',
      fontFamily: 'sans-serif',
      wordWrap: { width: 260 },
      align: 'center',
    }).setOrigin(0.5);

    new Button({
      scene: this,
      x: 160, y: 320,
      width: 200, height: 44,
      label: I18n.t(K.UI_NEW_GAME),
      callback: () => {
        deleteSave();
        const state = createInitialState(Date.now());
        this.scene.start(SCENE_KEYS.GAME, { state });
      },
    });

    new Button({
      scene: this,
      x: 160, y: 380,
      width: 200, height: 44,
      label: I18n.t(K.UI_MENU),
      color: 0x37474F,
      callback: () => {
        this.scene.start(SCENE_KEYS.MENU);
      },
    });
  }
}
