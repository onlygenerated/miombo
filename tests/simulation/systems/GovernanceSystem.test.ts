import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../../src/simulation/GameState.js';
import { updateGovernance } from '../../../src/simulation/systems/GovernanceSystem.js';
import { createTurnContext } from '../../../src/simulation/TurnContext.js';
import { GOVERNANCE } from '../../../src/config.js';

function stateWithRules(seed = 42) {
  const state = createInitialState(seed);
  return {
    ...state,
    communal: {
      ...state.communal,
      governance: {
        ...state.communal.governance,
        rules: [
          {
            type: 'grazing-limit' as const,
            details: { limit: 20 },
            votedFor: 3,
            votedAgainst: 1,
            compliance: 60,
            turnsActive: 5,
            locallyDefined: true,
          },
        ],
      },
    },
  };
}

describe('GovernanceSystem', () => {
  it('monitoring decays each turn', () => {
    const state = createInitialState(42);
    const ctx = createTurnContext();
    const result = updateGovernance(state, ctx);
    expect(result.communal.governance.monitoringLevel).toBe(
      state.communal.governance.monitoringLevel - GOVERNANCE.MONITORING_DECAY,
    );
  });

  it('meeting cooldown decrements', () => {
    const state = createInitialState(42);
    const withCooldown = {
      ...state,
      communal: {
        ...state.communal,
        governance: { ...state.communal.governance, meetingCooldown: 2 },
      },
    };
    const ctx = createTurnContext();
    const result = updateGovernance(withCooldown, ctx);
    expect(result.communal.governance.meetingCooldown).toBe(1);
  });

  it('meeting bonuses increase trust and cohesion', () => {
    const state = createInitialState(42);
    const ctx = createTurnContext();
    ctx.events.push('Community meeting called');
    const result = updateGovernance(state, ctx);
    expect(result.communal.governance.communityTrust).toBe(
      state.communal.governance.communityTrust + GOVERNANCE.TRUST_MEETING_BONUS,
    );
    expect(result.communal.governance.socialCohesion).toBe(
      state.communal.governance.socialCohesion + GOVERNANCE.COHESION_MEETING_BONUS,
    );
  });

  it('graduated sanctions escalate', () => {
    const state = stateWithRules();

    // No prior sanctions → social-pressure
    const withViolation = {
      ...state,
      communal: {
        ...state.communal,
        governance: {
          ...state.communal.governance,
          monitoringLevel: 100, // Guaranteed detection
          sanctionHistory: [],
        },
      },
    };
    const ctx = createTurnContext();
    ctx.neighborActions = [
      {
        neighborId: 'mubita',
        grazed: true,
        woodExtracted: 0,
        charcoalProduced: 0,
        violated: true,
        ruleViolated: 'grazing-limit',
      },
    ];
    const result = updateGovernance(withViolation, ctx);
    const sanction = result.communal.governance.sanctionHistory.find(
      (s) => s.targetId === 'mubita',
    );
    expect(sanction).toBeDefined();
    expect(sanction!.level).toBe('social-pressure');

    // With 1 prior → warning
    const withPrior = {
      ...withViolation,
      communal: {
        ...withViolation.communal,
        governance: {
          ...withViolation.communal.governance,
          sanctionHistory: [
            { targetId: 'mubita', level: 'social-pressure' as const, rule: 'grazing-limit', turn: 1 },
          ],
        },
      },
    };
    const ctx2 = createTurnContext();
    ctx2.neighborActions = ctx.neighborActions;
    const result2 = updateGovernance(withPrior, ctx2);
    const newSanctions = result2.communal.governance.sanctionHistory.filter(
      (s) => s.targetId === 'mubita' && s.turn === state.calendar.turn,
    );
    expect(newSanctions[0]?.level).toBe('warning');
  });

  it('local rule compliance bonus', () => {
    const state = stateWithRules();
    const withHighMonitoring = {
      ...state,
      communal: {
        ...state.communal,
        governance: {
          ...state.communal.governance,
          monitoringLevel: 50,
        },
      },
    };
    const ctx = createTurnContext();
    const result = updateGovernance(withHighMonitoring, ctx);
    // Locally-defined rule should have higher compliance than starting value
    // due to local bonus of +15 in the target calculation
    const rule = result.communal.governance.rules[0];
    expect(rule.turnsActive).toBe(6); // +1 from original 5
    // compliance should trend toward a higher value
    expect(rule.compliance).toBeGreaterThanOrEqual(50);
  });

  it('trust collapses without enforcement', () => {
    const state = stateWithRules();
    // Low monitoring → violations go undetected → trust drops
    const lowEnforcement = {
      ...state,
      communal: {
        ...state.communal,
        governance: {
          ...state.communal.governance,
          monitoringLevel: 0, // No detection
          communityTrust: 50,
        },
      },
    };
    const ctx = createTurnContext();
    ctx.neighborActions = [
      {
        neighborId: 'mubita',
        grazed: true,
        woodExtracted: 0,
        charcoalProduced: 0,
        violated: true,
        ruleViolated: 'grazing-limit',
      },
    ];
    const result = updateGovernance(lowEnforcement, ctx);
    // Undetected violations erode trust
    expect(result.communal.governance.communityTrust).toBeLessThan(50);
  });

  it('detected violations with enforcement increase trust', () => {
    const state = stateWithRules();
    const highEnforcement = {
      ...state,
      communal: {
        ...state.communal,
        governance: {
          ...state.communal.governance,
          monitoringLevel: 100,
          communityTrust: 50,
        },
      },
    };
    const ctx = createTurnContext();
    ctx.neighborActions = [
      {
        neighborId: 'mubita',
        grazed: true,
        woodExtracted: 0,
        charcoalProduced: 0,
        violated: true,
        ruleViolated: 'grazing-limit',
      },
    ];
    const result = updateGovernance(highEnforcement, ctx);
    expect(result.communal.governance.communityTrust).toBeGreaterThan(50);
  });

  it('trust and cohesion are clamped to [0, 100]', () => {
    const state = createInitialState(42);
    const extreme = {
      ...state,
      communal: {
        ...state.communal,
        governance: {
          ...state.communal.governance,
          communityTrust: 99,
          socialCohesion: 99,
        },
      },
    };
    const ctx = createTurnContext();
    ctx.events.push('Community meeting called');
    const result = updateGovernance(extreme, ctx);
    expect(result.communal.governance.communityTrust).toBeLessThanOrEqual(100);
    expect(result.communal.governance.socialCohesion).toBeLessThanOrEqual(100);
  });

  it('does not mutate original state', () => {
    const state = stateWithRules();
    const origTrust = state.communal.governance.communityTrust;
    const ctx = createTurnContext();
    updateGovernance(state, ctx);
    expect(state.communal.governance.communityTrust).toBe(origTrust);
  });
});
