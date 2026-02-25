import type { GameState } from '../GameState.js';
import type { TurnContext } from '../TurnContext.js';
import type { SanctionLevel, SanctionRecord } from '../models/Governance.js';
import { GOVERNANCE, CALENDAR } from '../../config.js';
import { clamp } from '../utils/clamp.js';
import { randomChance } from '../utils/random.js';

/**
 * Governance system — trust, monitoring, compliance, sanctions.
 *
 * Monitoring decays each turn. Compliance check: detect violations
 * (probability = monitoringLevel/100). Graduated sanctions:
 * social-pressure → warning → fine → exclusion. Meetings: trust/cohesion
 * bonuses. Locally-defined rules get +15 compliance.
 */
export function updateGovernance(state: GameState, ctx: TurnContext): GameState {
  const gov = state.communal.governance;

  // ── Monitoring decay ──
  let monitoring = clamp(gov.monitoringLevel - GOVERNANCE.MONITORING_DECAY, 0, 100);

  // ── Meeting cooldown ──
  let meetingCooldown = Math.max(0, gov.meetingCooldown - 1);

  // ── Detect violations ──
  const detectionProb = monitoring / 100;
  let trust = gov.communityTrust;
  let cohesion = gov.socialCohesion;
  const newSanctions: SanctionRecord[] = [];

  for (const na of ctx.neighborActions) {
    if (na.violated && na.ruleViolated) {
      // Was the violation detected?
      if (randomChance(state.rng, detectionProb)) {
        // ── Graduated sanctions ──
        const priorCount = gov.sanctionHistory.filter(
          (s) => s.targetId === na.neighborId,
        ).length;
        const level = graduatedSanction(priorCount);

        newSanctions.push({
          targetId: na.neighborId,
          level,
          rule: na.ruleViolated,
          turn: state.calendar.turn,
        });

        // Sanctions increase trust (enforcement works)
        trust += GOVERNANCE.TRUST_SANCTION_BONUS;
        ctx.events.push(
          `${na.neighborId} sanctioned (${level}) for violating ${na.ruleViolated}`,
        );
      } else {
        // Undetected violation erodes trust
        trust -= GOVERNANCE.TRUST_VIOLATION_PENALTY;
      }
    }
  }

  // ── Check if a meeting happened this turn ──
  const meetingThisTurn = ctx.events.some((e) => e.includes('Community meeting'));
  if (meetingThisTurn) {
    trust += GOVERNANCE.TRUST_MEETING_BONUS;
    cohesion += GOVERNANCE.COHESION_MEETING_BONUS;
  }

  // ── Update rule compliance ──
  const newRules = gov.rules.map((rule) => {
    const localBonus = rule.locallyDefined ? GOVERNANCE.COMPLIANCE_LOCAL_BONUS : 0;
    // Compliance trends toward base + monitoring + local bonus
    const targetCompliance = clamp(
      50 + monitoring * 0.3 + localBonus + cohesion * 0.2,
      0,
      100,
    );
    const compliance = rule.compliance + (targetCompliance - rule.compliance) * 0.1;
    return {
      ...rule,
      compliance: clamp(compliance, 0, 100),
      turnsActive: rule.turnsActive + 1,
    };
  });

  // ── Clamp values ──
  trust = clamp(trust, 0, 100);
  cohesion = clamp(cohesion, 0, 100);

  return {
    ...state,
    communal: {
      ...state.communal,
      governance: {
        ...gov,
        communityTrust: trust,
        socialCohesion: cohesion,
        monitoringLevel: monitoring,
        meetingCooldown,
        rules: newRules,
        sanctionHistory: [...gov.sanctionHistory, ...newSanctions],
      },
    },
  };
}

/** Map prior sanction count to graduated sanction level. */
function graduatedSanction(priorCount: number): SanctionLevel {
  if (priorCount === 0) return 'social-pressure';
  if (priorCount === 1) return 'warning';
  if (priorCount === 2) return 'fine';
  return 'exclusion';
}
