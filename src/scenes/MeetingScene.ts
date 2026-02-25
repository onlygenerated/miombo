import Phaser from 'phaser';
import { SCENE_KEYS } from './SceneKeys.js';
import { UI_COLORS } from '../rendering/colors.js';
import { Button } from '../ui/Button.js';
import { I18n } from '../i18n/I18n.js';
import { K } from '../i18n/keys.js';
import { saveGame } from '../persistence/SaveManager.js';
import type { GameState } from '../simulation/GameState.js';
import type { RuleType, CommunityRule } from '../simulation/models/Governance.js';

const RULE_TYPES: { type: RuleType; key: string }[] = [
  { type: 'grazing-limit', key: K.RULE_GRAZING_LIMIT },
  { type: 'woodland-quota', key: K.RULE_WOODLAND_QUOTA },
  { type: 'rotational-grazing', key: K.RULE_ROTATIONAL_GRAZING },
  { type: 'no-burn-zone', key: K.RULE_NO_BURN_ZONE },
  { type: 'harvest-season', key: K.RULE_HARVEST_SEASON },
  { type: 'technology-limit', key: K.RULE_TECHNOLOGY_LIMIT },
  { type: 'zonation', key: K.RULE_ZONATION },
];

/**
 * Community meeting scene — simplified governance prototype.
 * Shows resource report, active rules, and allows rule proposals.
 */
export class MeetingScene extends Phaser.Scene {
  private gameState!: GameState;
  private proposalMode = false;

  constructor() {
    super({ key: SCENE_KEYS.MEETING });
  }

  create(data: { state: GameState }): void {
    this.gameState = data.state;
    this.proposalMode = false;

    // Dark overlay
    this.add.rectangle(160, 240, 320, 480, UI_COLORS.OVERLAY, 0.8);

    // Title
    this.add.text(160, 30, I18n.t(K.MEET_TITLE), {
      fontSize: '18px', color: '#ffffff', fontFamily: 'sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.showReport();
  }

  private showReport(): void {
    const s = this.gameState;
    const gov = s.communal.governance;
    let y = 60;

    // Resource report header
    this.add.text(16, y, I18n.t(K.MEET_REPORT), {
      fontSize: '13px', color: '#FFD700', fontFamily: 'sans-serif', fontStyle: 'bold',
    });
    y += 22;

    const reportLines = [
      I18n.t(K.MEET_GRAZING_HEALTH, Math.round(s.communal.grazing.health)),
      I18n.t(K.MEET_WOODLAND_DENSITY, Math.round(s.communal.woodland.density)),
      I18n.t(K.MEET_WILDLIFE, Math.round(s.communal.wildlife.presence)),
      I18n.t(K.MEET_MONITORING, Math.round(gov.monitoringLevel)),
    ];

    reportLines.forEach(line => {
      this.add.text(20, y, line, {
        fontSize: '11px', color: '#cccccc', fontFamily: 'sans-serif',
      });
      y += 18;
    });

    // Violations
    const recentViolations = gov.sanctionHistory.filter(
      sh => sh.turn >= s.calendar.turn - 3
    ).length;
    this.add.text(20, y, I18n.t(K.MEET_VIOLATIONS, recentViolations), {
      fontSize: '11px', color: recentViolations > 0 ? '#FF4444' : '#4CAF50',
      fontFamily: 'sans-serif',
    });
    y += 24;

    // Active rules
    this.add.text(16, y, I18n.t(K.MEET_ACTIVE_RULES), {
      fontSize: '13px', color: '#FFD700', fontFamily: 'sans-serif', fontStyle: 'bold',
    });
    y += 20;

    if (gov.rules.length === 0) {
      this.add.text(20, y, 'No community rules established yet.', {
        fontSize: '10px', color: '#aaaaaa', fontFamily: 'sans-serif',
      });
      y += 18;
    } else {
      gov.rules.forEach(rule => {
        const ruleKey = `rule.${rule.type}`;
        this.add.text(20, y, `${I18n.t(ruleKey)} — ${Math.round(rule.compliance)}% compliance`, {
          fontSize: '10px', color: '#cccccc', fontFamily: 'sans-serif',
        });
        y += 16;
      });
    }
    y += 10;

    // Propose Rule button
    const activeTypes = new Set(gov.rules.map(r => r.type));
    const availableRules = RULE_TYPES.filter(r => !activeTypes.has(r.type));

    if (availableRules.length > 0) {
      new Button({
        scene: this,
        x: 100, y: Math.min(y + 20, 380),
        width: 150, height: 32,
        label: I18n.t(K.MEET_PROPOSE_RULE),
        color: 0x6A1B9A,
        callback: () => {
          if (!this.proposalMode) {
            this.proposalMode = true;
            this.showProposalButtons(availableRules, Math.min(y + 44, 394));
          }
        },
      });
    }

    // Continue button
    new Button({
      scene: this,
      x: 160, y: 450,
      width: 200, height: 36,
      label: I18n.t(K.UI_CONTINUE),
      callback: () => {
        this.scene.stop();
        const gameScene = this.scene.get(SCENE_KEYS.GAME);
        gameScene.events.emit('overlay-closed', this.gameState);
      },
    });
  }

  private showProposalButtons(available: { type: RuleType; key: string }[], startY: number): void {
    available.slice(0, 3).forEach((ruleDef, i) => {
      new Button({
        scene: this,
        x: 160, y: startY + i * 34,
        width: 240, height: 28,
        label: I18n.t(ruleDef.key),
        color: 0x4a148c,
        fontSize: 11,
        callback: () => this.proposeRule(ruleDef.type),
      });
    });
  }

  private proposeRule(ruleType: RuleType): void {
    // Auto-vote: player + 3 neighbors. Neighbor votes based on social trait.
    const neighbors = this.gameState.neighbors;
    let votesFor = 1; // Player votes for
    let votesAgainst = 0;

    neighbors.forEach(n => {
      // Neighbors with higher social trait more likely to support rules
      const support = n.traits.social - n.traits.greed * 0.5;
      if (support > 0.3) {
        votesFor++;
      } else {
        votesAgainst++;
      }
    });

    const passed = votesFor > votesAgainst;

    if (passed) {
      const newRule: CommunityRule = {
        type: ruleType,
        details: {},
        votedFor: votesFor,
        votedAgainst: votesAgainst,
        compliance: 50,
        turnsActive: 0,
        locallyDefined: true,
      };

      this.gameState = {
        ...this.gameState,
        communal: {
          ...this.gameState.communal,
          governance: {
            ...this.gameState.communal.governance,
            rules: [...this.gameState.communal.governance.rules, newRule],
          },
        },
      };
      saveGame(this.gameState);
    }

    // Show result message
    const msg = passed ? I18n.t(K.MEET_RULE_PASSED) : I18n.t(K.MEET_RULE_FAILED);
    const color = passed ? '#4CAF50' : '#FF4444';
    const resultText = this.add.text(160, 410, msg, {
      fontSize: '12px', color, fontFamily: 'sans-serif', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.time.delayedCall(2000, () => resultText.destroy());
  }
}
