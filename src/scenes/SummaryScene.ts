import Phaser from 'phaser';
import { SCENE_KEYS } from './SceneKeys.js';
import { UI_COLORS } from '../rendering/colors.js';
import { Button } from '../ui/Button.js';
import { I18n } from '../i18n/I18n.js';
import { K } from '../i18n/keys.js';
import { formatMoney } from '../rendering/StateRenderer.js';
import type { GameState } from '../simulation/GameState.js';

interface SummaryData {
  state: GameState;
  prevState: GameState;
  isChapterEnd: boolean;
}

/**
 * Year-end / chapter-end summary.
 * Shows key metrics with before/after.
 * At chapter-end: two phases — metrics then narrative transition.
 */
export class SummaryScene extends Phaser.Scene {
  private summaryData!: SummaryData;
  private phaseObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: SCENE_KEYS.SUMMARY });
  }

  create(data: SummaryData): void {
    this.summaryData = data;
    this.phaseObjects = [];

    // Dark overlay
    this.add.rectangle(160, 240, 320, 480, UI_COLORS.OVERLAY, 0.8);

    this.showMetricsPhase();
  }

  private showMetricsPhase(): void {
    this.clearPhase();
    const { state, prevState, isChapterEnd } = this.summaryData;

    // Title
    const title = isChapterEnd
      ? I18n.t(K.SUM_CHAPTER_END, state.generation.chapter)
      : I18n.t(K.SUM_YEAR_END, state.calendar.year);

    this.phaseObjects.push(
      this.add.text(160, 40, title, {
        fontSize: '18px',
        color: isChapterEnd ? '#FFD700' : '#ffffff',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
      }).setOrigin(0.5)
    );

    // Metrics comparison
    const metrics = [
      {
        label: I18n.t(K.SUM_GRAZING),
        before: `${Math.round(prevState.communal.grazing.health)}%`,
        after: `${Math.round(state.communal.grazing.health)}%`,
        icon: '\uD83C\uDF3F',
      },
      {
        label: I18n.t(K.SUM_WOODLAND),
        before: `${Math.round(prevState.communal.woodland.density)}%`,
        after: `${Math.round(state.communal.woodland.density)}%`,
        icon: '\uD83C\uDF32',
      },
      {
        label: I18n.t(K.SUM_CATTLE),
        before: String(prevState.player.livestock.cattle),
        after: String(state.player.livestock.cattle),
        icon: '\uD83D\uDC02',
      },
      {
        label: I18n.t(K.SUM_MONEY),
        before: formatMoney(prevState.player.money),
        after: formatMoney(state.player.money),
        icon: '\uD83D\uDCB0',
      },
      {
        label: I18n.t(K.SUM_TRUST),
        before: `${Math.round(prevState.communal.governance.communityTrust)}%`,
        after: `${Math.round(state.communal.governance.communityTrust)}%`,
        icon: '\uD83E\uDD1D',
      },
      {
        label: I18n.t(K.SUM_WELLBEING),
        before: String(prevState.player.wellbeing),
        after: String(state.player.wellbeing),
        icon: '\u2764\uFE0F',
      },
    ];

    const startY = 80;
    const rowH = 40;

    // Header
    this.phaseObjects.push(
      this.add.text(140, startY, 'Before', {
        fontSize: '10px', color: '#aaaaaa', fontFamily: 'sans-serif',
      }).setOrigin(0.5)
    );
    this.phaseObjects.push(
      this.add.text(220, startY, 'After', {
        fontSize: '10px', color: '#aaaaaa', fontFamily: 'sans-serif',
      }).setOrigin(0.5)
    );

    metrics.forEach((m, i) => {
      const y = startY + 20 + i * rowH;

      this.phaseObjects.push(
        this.add.text(10, y, `${m.icon} ${m.label}`, {
          fontSize: '11px', color: '#ffffff', fontFamily: 'sans-serif',
        }).setOrigin(0, 0.5)
      );

      this.phaseObjects.push(
        this.add.text(140, y, m.before, {
          fontSize: '11px', color: '#aaaaaa', fontFamily: 'sans-serif',
        }).setOrigin(0.5)
      );

      this.phaseObjects.push(
        this.add.text(220, y, m.after, {
          fontSize: '12px', color: '#ffffff', fontFamily: 'sans-serif', fontStyle: 'bold',
        }).setOrigin(0.5)
      );

      const beforeNum = parseFloat(m.before.replace(/[^0-9.-]/g, ''));
      const afterNum = parseFloat(m.after.replace(/[^0-9.-]/g, ''));
      if (!isNaN(beforeNum) && !isNaN(afterNum)) {
        const delta = afterNum - beforeNum;
        const arrow = delta > 0 ? '\u25B2' : delta < 0 ? '\u25BC' : '\u25CF';
        const color = delta > 0 ? '#4CAF50' : delta < 0 ? '#FF4444' : '#aaaaaa';
        this.phaseObjects.push(
          this.add.text(270, y, arrow, {
            fontSize: '12px', color, fontFamily: 'sans-serif',
          }).setOrigin(0.5)
        );
      }
    });

    // Inheritance info at chapter-end
    if (isChapterEnd && state.generation.inheritance) {
      const inh = state.generation.inheritance;
      const inhY = startY + 20 + metrics.length * rowH + 10;
      this.phaseObjects.push(
        this.add.text(160, inhY, I18n.t(K.SUM_INHERITANCE,
          inh.cattleInherited, inh.moneyInherited, inh.knowledgeInherited), {
          fontSize: '11px',
          color: '#FFD700',
          fontFamily: 'sans-serif',
          wordWrap: { width: 280 },
          align: 'center',
        }).setOrigin(0.5)
      );
    }

    // Button
    const btnLabel = isChapterEnd ? I18n.t(K.UI_CONTINUE) : I18n.t(K.UI_CONTINUE);
    this.phaseObjects.push(
      new Button({
        scene: this,
        x: 160, y: 440,
        width: 200, height: 40,
        label: btnLabel,
        callback: () => {
          if (isChapterEnd) {
            this.showChapterNarrativePhase();
          } else {
            this.scene.stop();
            const gameScene = this.scene.get(SCENE_KEYS.GAME);
            gameScene.events.emit('overlay-closed');
          }
        },
      })
    );
  }

  private showChapterNarrativePhase(): void {
    this.clearPhase();
    const { state } = this.summaryData;

    // Chapter transition title
    this.phaseObjects.push(
      this.add.text(160, 50, I18n.t(K.SUM_CHAPTER_END, state.generation.chapter - 1), {
        fontSize: '16px',
        color: '#FFD700',
        fontFamily: 'sans-serif',
        fontStyle: 'bold',
        align: 'center',
      }).setOrigin(0.5)
    );

    // Generation passing narrative
    this.phaseObjects.push(
      this.add.text(160, 130, I18n.t(K.SUM_CHAPTER_NARRATIVE), {
        fontSize: '12px',
        color: '#cccccc',
        fontFamily: 'sans-serif',
        wordWrap: { width: 270 },
        align: 'center',
        lineSpacing: 6,
      }).setOrigin(0.5)
    );

    // Population pressure warning
    this.phaseObjects.push(
      this.add.text(160, 250, I18n.t(K.SUM_CHAPTER_PRESSURE), {
        fontSize: '11px',
        color: '#FFA000',
        fontFamily: 'sans-serif',
        wordWrap: { width: 270 },
        align: 'center',
        lineSpacing: 4,
      }).setOrigin(0.5)
    );

    // Inheritance summary
    if (state.generation.inheritance) {
      const inh = state.generation.inheritance;
      this.phaseObjects.push(
        this.add.text(160, 330, I18n.t(K.SUM_INHERITANCE,
          inh.cattleInherited, inh.moneyInherited, inh.knowledgeInherited), {
          fontSize: '11px',
          color: '#FFD700',
          fontFamily: 'sans-serif',
          wordWrap: { width: 270 },
          align: 'center',
        }).setOrigin(0.5)
      );
    }

    // Begin New Chapter button
    this.phaseObjects.push(
      new Button({
        scene: this,
        x: 160, y: 430,
        width: 220, height: 44,
        label: I18n.t(K.SUM_CHAPTER_BEGIN),
        color: 0x6A1B9A,
        callback: () => {
          this.scene.stop();
          const gameScene = this.scene.get(SCENE_KEYS.GAME);
          gameScene.events.emit('overlay-closed');
        },
      })
    );
  }

  private clearPhase(): void {
    this.phaseObjects.forEach(obj => obj.destroy());
    this.phaseObjects = [];
  }
}
