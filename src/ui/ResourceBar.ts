import Phaser from 'phaser';

export interface ResourceBarConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  icon: string;
  value: number | string;
  fontSize?: number;
}

/**
 * HUD resource display: icon (emoji text) + value.
 * Used for cattle, grain, money in HUDScene.
 */
export class ResourceBar extends Phaser.GameObjects.Container {
  private iconText: Phaser.GameObjects.Text;
  private valueText: Phaser.GameObjects.Text;

  constructor(config: ResourceBarConfig) {
    super(config.scene, config.x, config.y);

    const size = config.fontSize ?? 12;

    this.iconText = config.scene.add.text(0, 0, config.icon, {
      fontSize: `${size + 2}px`,
    }).setOrigin(0, 0.5);

    this.valueText = config.scene.add.text(size + 4, 0, String(config.value), {
      fontSize: `${size}px`,
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.add([this.iconText, this.valueText]);
    config.scene.add.existing(this);
  }

  setValue(value: number | string): void {
    this.valueText.setText(String(value));
  }

  setIcon(icon: string): void {
    this.iconText.setText(icon);
  }
}
