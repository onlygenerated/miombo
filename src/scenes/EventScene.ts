import Phaser from 'phaser';
import { SCENE_KEYS } from './SceneKeys.js';
import { UI_COLORS } from '../rendering/colors.js';
import { Button } from '../ui/Button.js';
import { I18n } from '../i18n/I18n.js';
import { K } from '../i18n/keys.js';
import type { GameState } from '../simulation/GameState.js';
import type { NarrativeEvent } from '../simulation/models/NarrativeEvent.js';

const SEVERITY_COLORS: Record<NarrativeEvent['severity'], number> = {
  info: 0x1565C0,
  warning: 0xFFA000,
  critical: 0xFF4444,
  positive: 0x4CAF50,
};

/**
 * Narrative event panel — paginated display of structured narrative events.
 * Falls back to simple text list for plain events[] strings.
 */
export class EventScene extends Phaser.Scene {
  private narrativeEvents: NarrativeEvent[] = [];
  private plainEvents: string[] = [];
  private currentPage = 0;
  private pageObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: SCENE_KEYS.EVENT });
  }

  create(data: { state: GameState }): void {
    const state = data.state;
    this.narrativeEvents = state.narrativeEvents || [];
    this.plainEvents = state.events || [];
    this.currentPage = 0;
    this.pageObjects = [];

    // Dark overlay
    this.add.rectangle(160, 240, 320, 480, UI_COLORS.OVERLAY, 0.8);

    // Title
    this.add.text(160, 30, I18n.t(K.EVT_TITLE), {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    if (this.narrativeEvents.length > 0) {
      this.showNarrativePage();
    } else {
      this.showPlainEvents();
    }
  }

  private showNarrativePage(): void {
    // Clear previous page objects
    this.pageObjects.forEach(obj => obj.destroy());
    this.pageObjects = [];

    const evt = this.narrativeEvents[this.currentPage];
    const borderColor = SEVERITY_COLORS[evt.severity];

    // Card background with severity-colored border
    const card = this.add.rectangle(160, 200, 280, 240, UI_COLORS.PANEL, 0.95)
      .setStrokeStyle(3, borderColor);
    this.pageObjects.push(card);

    // Icon (large)
    const icon = this.add.text(160, 110, evt.icon, {
      fontSize: '40px',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5);
    this.pageObjects.push(icon);

    // Title
    const title = this.add.text(160, 155, I18n.t(evt.titleKey), {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);
    this.pageObjects.push(title);

    // Severity badge
    const severityLabel = evt.severity.toUpperCase();
    const badge = this.add.text(160, 178, severityLabel, {
      fontSize: '9px',
      color: '#' + borderColor.toString(16).padStart(6, '0'),
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.pageObjects.push(badge);

    // Body text
    const body = this.add.text(160, 240, I18n.t(evt.bodyKey), {
      fontSize: '12px',
      color: '#cccccc',
      fontFamily: 'sans-serif',
      wordWrap: { width: 250 },
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5);
    this.pageObjects.push(body);

    // Page indicator
    if (this.narrativeEvents.length > 1) {
      const pageText = this.add.text(160, 340,
        `${this.currentPage + 1} / ${this.narrativeEvents.length}`, {
        fontSize: '10px',
        color: '#aaaaaa',
        fontFamily: 'sans-serif',
      }).setOrigin(0.5);
      this.pageObjects.push(pageText);
    }

    // Navigation button
    const isLast = this.currentPage >= this.narrativeEvents.length - 1;
    const btnLabel = isLast ? I18n.t(K.UI_CONTINUE) : I18n.t(K.EVT_NEXT);

    const btn = new Button({
      scene: this,
      x: 160, y: 420,
      width: 200, height: 40,
      label: btnLabel,
      callback: () => {
        if (isLast) {
          this.scene.stop();
          const gameScene = this.scene.get(SCENE_KEYS.GAME);
          gameScene.events.emit('overlay-closed');
        } else {
          this.currentPage++;
          this.showNarrativePage();
        }
      },
    });
    this.pageObjects.push(btn);
  }

  private showPlainEvents(): void {
    const events = this.plainEvents;
    const startY = 60;
    const cardHeight = 50;
    const gap = 8;

    events.forEach((evt, i) => {
      const y = startY + i * (cardHeight + gap);
      if (y > 390) return;

      this.add.rectangle(160, y + cardHeight / 2, 290, cardHeight, UI_COLORS.PANEL, 0.9)
        .setStrokeStyle(1, UI_COLORS.BORDER);

      this.add.text(22, y + 8, evt, {
        fontSize: '11px',
        color: '#ffffff',
        fontFamily: 'sans-serif',
        wordWrap: { width: 270 },
      });
    });

    if (events.length === 0) {
      this.add.text(160, 200, 'No events this turn.', {
        fontSize: '12px',
        color: '#aaaaaa',
        fontFamily: 'sans-serif',
      }).setOrigin(0.5);
    }

    new Button({
      scene: this,
      x: 160, y: 440,
      width: 200, height: 40,
      label: I18n.t(K.UI_CONTINUE),
      callback: () => {
        this.scene.stop();
        const gameScene = this.scene.get(SCENE_KEYS.GAME);
        gameScene.events.emit('overlay-closed');
      },
    });
  }
}
