import Phaser from 'phaser';
import { I18n } from '../i18n/I18n.js';
import { SCENE_KEYS } from './SceneKeys.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.BOOT });
  }

  preload(): void {
    // Show loading text
    const text = this.add.text(160, 240, 'Loading...', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);

    this.load.json('locale', 'locales/en.json');

    this.load.on('complete', () => {
      text.destroy();
    });
  }

  create(): void {
    const localeData = this.cache.json.get('locale');
    if (localeData) {
      I18n.load(localeData);
    }
    this.scene.start(SCENE_KEYS.MENU);
  }
}
