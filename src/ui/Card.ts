import Phaser from 'phaser';
import { UI_COLORS, CATEGORY_COLORS } from '../rendering/colors.js';

export interface CardConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  icon: string;
  description: string;
  category: string;
  callback: () => void;
}

/**
 * Action card for DecisionScene.
 * Rectangle with category color, icon text, title, and description.
 * Selected state shows highlighted border.
 */
export class Card extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private _selected = false;
  private categoryColor: number;

  constructor(config: CardConfig) {
    super(config.scene, config.x, config.y);

    const w = config.width;
    const h = config.height;
    this.categoryColor = CATEGORY_COLORS[config.category] ?? UI_COLORS.PANEL;

    this.bg = config.scene.add.rectangle(0, 0, w, h, this.categoryColor, 0.85)
      .setOrigin(0.5)
      .setStrokeStyle(2, UI_COLORS.BORDER);

    const icon = config.scene.add.text(-w / 2 + 8, -h / 2 + 6, config.icon, {
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0, 0);

    const title = config.scene.add.text(-w / 2 + 30, -h / 2 + 6, config.title, {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      wordWrap: { width: w - 42 },
    }).setOrigin(0, 0);

    const desc = config.scene.add.text(-w / 2 + 8, -h / 2 + 24, config.description, {
      fontSize: '10px',
      color: '#cccccc',
      fontFamily: 'sans-serif',
      wordWrap: { width: w - 16 },
    }).setOrigin(0, 0);

    this.add([this.bg, icon, title, desc]);
    this.setSize(w, h);
    this.setInteractive();

    this.on('pointerup', () => config.callback());

    config.scene.add.existing(this);
  }

  get selected(): boolean {
    return this._selected;
  }

  setSelected(selected: boolean): void {
    this._selected = selected;
    if (selected) {
      this.bg.setStrokeStyle(3, UI_COLORS.HIGHLIGHT);
    } else {
      this.bg.setStrokeStyle(2, UI_COLORS.BORDER);
    }
  }
}
