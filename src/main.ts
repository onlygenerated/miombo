import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { HUDScene } from './scenes/HUDScene.js';
import { DecisionScene } from './scenes/DecisionScene.js';
import { EventScene } from './scenes/EventScene.js';
import { MeetingScene } from './scenes/MeetingScene.js';
import { SummaryScene } from './scenes/SummaryScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 320,
  height: 480,
  parent: 'game-container',
  backgroundColor: '#2d5016',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    BootScene,
    MenuScene,
    GameScene,
    HUDScene,
    DecisionScene,
    EventScene,
    MeetingScene,
    SummaryScene,
    GameOverScene,
  ],
};

new Phaser.Game(config);

// Register service worker for PWA offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed — game still works without it
    });
  });
}
