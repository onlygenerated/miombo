import Phaser from 'phaser';
import { SCENE_KEYS } from './SceneKeys.js';
import { UI_COLORS, ZONE_COLORS } from '../rendering/colors.js';
import { Button } from '../ui/Button.js';
import { I18n } from '../i18n/I18n.js';
import { K } from '../i18n/keys.js';
import { buildZoneLayout, zoneBaseColor, zoneTint } from '../rendering/StateRenderer.js';
import type { ZoneType } from '../rendering/StateRenderer.js';
import type { GameState } from '../simulation/GameState.js';
import { CALENDAR } from '../config.js';
import type { HUDScene } from './HUDScene.js';

const GRID_COLS = 8;
const GRID_ROWS = 10;
const TILE_W = 36;
const TILE_H = 28;
const GAP = 3;
const GRID_X = 2;
const GRID_Y = 50;
const BOTTOM_BAR_Y = 440;

/**
 * Main game view — tile grid of colored rectangles for zones,
 * bottom bar with Plan Turn / Menu buttons.
 * Launches HUDScene as overlay. Orchestrates post-turn scene chain.
 */
export class GameScene extends Phaser.Scene {
  private gameState!: GameState;
  private tiles: Phaser.GameObjects.Rectangle[] = [];
  private zoneLayout: ZoneType[] = [];
  private postTurnQueue: string[] = [];
  private prevState: GameState | null = null;

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  create(data: { state: GameState }): void {
    this.gameState = data.state;
    this.cameras.main.setBackgroundColor(UI_COLORS.BG_GREEN);

    // Build zone layout
    this.zoneLayout = buildZoneLayout(this.gameState);

    // Create tile grid
    this.tiles = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const idx = row * GRID_COLS + col;
        const zone = this.zoneLayout[idx];
        const x = GRID_X + col * (TILE_W + GAP) + TILE_W / 2;
        const y = GRID_Y + row * (TILE_H + GAP) + TILE_H / 2;

        const tile = this.add.rectangle(x, y, TILE_W, TILE_H, zoneBaseColor(zone))
          .setStrokeStyle(1, 0x000000, 0.3);

        this.tiles.push(tile);
      }
    }

    this.updateTileColors();

    // Zone legend with colored swatches
    const legendY = GRID_Y + GRID_ROWS * (TILE_H + GAP) + 8;
    const legendItems: { color: number; label: string }[] = [
      { color: ZONE_COLORS.WOODLAND, label: 'Woodland' },
      { color: ZONE_COLORS.GRAZING, label: 'Grazing' },
      { color: ZONE_COLORS.CROP_FIELD, label: 'Crops' },
      { color: ZONE_COLORS.SETTLEMENT, label: 'Settlement' },
    ];

    legendItems.forEach((item, i) => {
      const x = 10 + i * 78;
      this.add.rectangle(x + 6, legendY + 6, 12, 12, item.color)
        .setStrokeStyle(1, 0x000000, 0.4);
      this.add.text(x + 16, legendY, item.label, {
        fontSize: '10px', color: '#cccccc', fontFamily: 'sans-serif',
      });
    });

    // Health key
    this.add.text(10, legendY + 20, 'Bright = healthy    Dark = degraded', {
      fontSize: '9px', color: '#888888', fontFamily: 'sans-serif',
    });

    // Bottom bar background
    this.add.rectangle(160, BOTTOM_BAR_Y + 20, 320, 48, UI_COLORS.BG_DARK, 0.9);

    // Plan Turn button
    new Button({
      scene: this,
      x: 110, y: BOTTOM_BAR_Y + 20,
      width: 140, height: 36,
      label: I18n.t(K.UI_PLAN_TURN),
      callback: () => this.openDecisionScene(),
    });

    // Menu button
    new Button({
      scene: this,
      x: 250, y: BOTTOM_BAR_Y + 20,
      width: 80, height: 36,
      label: I18n.t(K.UI_MENU),
      color: 0x37474F,
      callback: () => {
        this.scene.stop(SCENE_KEYS.HUD);
        this.scene.start(SCENE_KEYS.MENU);
      },
    });

    // Launch HUD overlay
    this.scene.launch(SCENE_KEYS.HUD, { state: this.gameState });

    // Listen for overlay scenes closing (post-turn chain)
    this.events.on('overlay-closed', (updatedState?: GameState) => {
      if (updatedState) {
        this.gameState = updatedState;
        this.updateDisplay();
      }
      this.advancePostTurnQueue();
    });

    // Listen for turn-processed event from DecisionScene
    this.events.on('turn-processed', (newState: GameState, prevState: GameState) => {
      this.prevState = prevState;
      this.gameState = newState;
      this.updateDisplay();
      this.buildPostTurnQueue();
      this.scene.pause();
      this.advancePostTurnQueue();
    });
  }

  private openDecisionScene(): void {
    this.scene.launch(SCENE_KEYS.DECISION, { state: this.gameState });
    this.scene.pause();
  }

  private updateDisplay(): void {
    this.updateTileColors();
    const hudScene = this.scene.get(SCENE_KEYS.HUD) as HUDScene;
    if (hudScene && hudScene.scene.isActive()) {
      hudScene.updateState(this.gameState);
    }
  }

  private updateTileColors(): void {
    for (let i = 0; i < this.tiles.length; i++) {
      const zone = this.zoneLayout[i];
      const color = zoneTint(zone, this.gameState);
      this.tiles[i].setFillStyle(color);
    }
  }

  private buildPostTurnQueue(): void {
    this.postTurnQueue = [];
    const state = this.gameState;
    const turn = state.calendar.turn;

    // Events? (narrative events take priority, but also show plain events)
    if (state.narrativeEvents.length > 0 || state.events.length > 0) {
      this.postTurnQueue.push(SCENE_KEYS.EVENT);
    }

    // Meeting due? (quarterly)
    if (turn > 0 && turn % CALENDAR.MEETING_INTERVAL === 0) {
      this.postTurnQueue.push(SCENE_KEYS.MEETING);
    }

    // Year-end summary?
    if (turn > 0 && turn % CALENDAR.TURNS_PER_YEAR === 0) {
      this.postTurnQueue.push(SCENE_KEYS.SUMMARY);
    }

    // Chapter-end? (turn 144, 288, etc.) — handled by SummaryScene with isChapterEnd flag
    // Already covered above since TURNS_PER_CHAPTER is a multiple of TURNS_PER_YEAR

    // Game over check: all cattle dead AND money <= 0
    if (state.player.livestock.cattle <= 0 && state.player.money <= 0) {
      this.postTurnQueue.push(SCENE_KEYS.GAME_OVER);
    }
  }

  private advancePostTurnQueue(): void {
    if (this.postTurnQueue.length === 0) {
      // All post-turn scenes done, resume game
      this.scene.resume();
      return;
    }

    const nextScene = this.postTurnQueue.shift()!;

    if (nextScene === SCENE_KEYS.GAME_OVER) {
      this.scene.stop(SCENE_KEYS.HUD);
      this.scene.start(SCENE_KEYS.GAME_OVER);
      return;
    }

    if (nextScene === SCENE_KEYS.SUMMARY) {
      const turn = this.gameState.calendar.turn;
      const isChapterEnd = turn > 0 && turn % CALENDAR.TURNS_PER_CHAPTER === 0;
      this.scene.launch(nextScene, {
        state: this.gameState,
        prevState: this.prevState || this.gameState,
        isChapterEnd,
      });
    } else {
      this.scene.launch(nextScene, { state: this.gameState });
    }
  }
}
