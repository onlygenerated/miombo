import Phaser from 'phaser';
import { UI_COLORS } from '../rendering/colors.js';

export interface ButtonConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color?: number;
  textColor?: string;
  fontSize?: number;
  callback: () => void;
}

/**
 * Reusable tappable button: colored rectangle + centered text label.
 */
export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private baseColor: number;

  constructor(config: ButtonConfig) {
    super(config.scene, config.x, config.y);

    this.baseColor = config.color ?? UI_COLORS.BUTTON;
    const w = config.width;
    const h = config.height;

    this.bg = config.scene.add.rectangle(0, 0, w, h, this.baseColor)
      .setOrigin(0.5)
      .setStrokeStyle(1, UI_COLORS.BORDER);

    this.label = config.scene.add.text(0, 0, config.label, {
      fontSize: `${config.fontSize ?? 14}px`,
      color: config.textColor ?? '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: w - 8 },
    }).setOrigin(0.5);

    this.add([this.bg, this.label]);
    this.setSize(w, h);
    this.setInteractive();

    this.on('pointerdown', () => {
      this.bg.setFillStyle(config.color ? config.color - 0x111111 : UI_COLORS.BUTTON_PRESSED);
    });
    this.on('pointerup', () => {
      this.bg.setFillStyle(this.baseColor);
      config.callback();
    });
    this.on('pointerout', () => {
      this.bg.setFillStyle(this.baseColor);
    });

    config.scene.add.existing(this);
  }

  setText(text: string): void {
    this.label.setText(text);
  }

  setEnabled(enabled: boolean): void {
    if (enabled) {
      this.setInteractive();
      this.bg.setFillStyle(this.baseColor);
      this.label.setAlpha(1);
    } else {
      this.disableInteractive();
      this.bg.setFillStyle(UI_COLORS.BUTTON_DISABLED);
      this.label.setAlpha(0.5);
    }
  }
}
