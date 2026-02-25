import type { GameState } from '../GameState.js';
import type { TurnContext } from '../TurnContext.js';
import type { NarrativeEvent } from '../models/NarrativeEvent.js';
import { WOODLAND } from '../../config.js';
import { random } from '../utils/random.js';

const MIN_COOLDOWN = 6; // Minimum turns between same narrative event

interface EventDef {
  id: string;
  titleKey: string;
  bodyKey: string;
  icon: string;
  severity: NarrativeEvent['severity'];
  trigger: (state: GameState, ctx: TurnContext) => boolean;
}

const EVENT_DEFS: EventDef[] = [
  {
    id: 'drought',
    titleKey: 'evt.drought.title',
    bodyKey: 'evt.drought.body',
    icon: '\u2600\uFE0F',
    severity: 'warning',
    trigger: (s) => s.calendar.drought && s.calendar.season === 'hot-dry',
  },
  {
    id: 'elephant-raid',
    titleKey: 'evt.elephant-raid.title',
    bodyKey: 'evt.elephant-raid.body',
    icon: '\uD83D\uDC18',
    severity: 'critical',
    trigger: (s) =>
      s.communal.wildlife.presence > 50 &&
      s.player.fields.some(f => f.stage === 'growing' || f.stage === 'ready') &&
      !s.player.hwcMitigation.chilliFence,
  },
  {
    id: 'lion-attack',
    titleKey: 'evt.lion-attack.title',
    bodyKey: 'evt.lion-attack.body',
    icon: '\uD83E\uDD81',
    severity: 'critical',
    trigger: (s) =>
      s.communal.wildlife.presence > 40 &&
      s.player.livestock.cattle > 0 &&
      !s.player.hwcMitigation.nightKraal,
  },
  {
    id: 'tipping-point',
    titleKey: 'evt.tipping-point.title',
    bodyKey: 'evt.tipping-point.body',
    icon: '\u26A0\uFE0F',
    severity: 'critical',
    trigger: (s) => s.communal.grazing.health < 10,
  },
  {
    id: 'woodland-recovery',
    titleKey: 'evt.woodland-recovery.title',
    bodyKey: 'evt.woodland-recovery.body',
    icon: '\uD83C\uDF33',
    severity: 'positive',
    trigger: (s) =>
      s.communal.woodland.density > 50 &&
      s.communal.woodland.density >= WOODLAND.INITIAL_DENSITY + 10,
  },
  {
    id: 'trust-milestone',
    titleKey: 'evt.trust-milestone.title',
    bodyKey: 'evt.trust-milestone.body',
    icon: '\uD83E\uDD1D',
    severity: 'positive',
    trigger: (s) => s.communal.governance.communityTrust > 70,
  },
  {
    id: 'neighbor-conflict',
    titleKey: 'evt.neighbor-conflict.title',
    bodyKey: 'evt.neighbor-conflict.body',
    icon: '\uD83D\uDDE3\uFE0F',
    severity: 'warning',
    trigger: (s) =>
      s.communal.governance.rules.length > 0 &&
      s.neighbors.some(n => n.compliance < 30),
  },
  {
    id: 'market-opportunity',
    titleKey: 'evt.market-opportunity.title',
    bodyKey: 'evt.market-opportunity.body',
    icon: '\uD83D\uDCB0',
    severity: 'info',
    trigger: (s) => s.economy.trend === 'rising' && random(s.rng) < 0.1,
  },
];

/**
 * Event system — checks triggers and produces both system log events
 * and structured narrative events with cooldowns.
 */
export function updateEvents(state: GameState, ctx: TurnContext): GameState {
  const events: string[] = [];

  // ── System log events (kept for backwards compatibility) ──
  if (state.calendar.drought) {
    events.push('Drought conditions persist — crops and grazing suffer.');
  }
  if (state.communal.grazing.degradationLevel >= 3) {
    events.push('The communal grazing land is severely degraded.');
  }
  if (state.communal.woodland.density < 10) {
    events.push('Woodland is critically low — ecosystem services collapsing.');
  }
  if (state.calendar.turn > 0 && state.calendar.turn % 12 === 0) {
    events.push(`Year ${state.calendar.year} complete.`);
  }
  if (state.communal.wildlife.hwcPressure > 60) {
    events.push('Human-wildlife conflict is escalating.');
  }
  if (state.communal.grazing.biomass < 200) {
    events.push('Grazing biomass critically low — livestock at risk of starvation.');
  }

  const allEvents = [...ctx.events, ...events];

  // ── Structured narrative events with cooldowns ──
  const cooldowns = { ...state.narrativeEventCooldowns };
  const narrativeEvents: NarrativeEvent[] = [];

  // Decrement all cooldowns
  for (const key of Object.keys(cooldowns)) {
    cooldowns[key] = Math.max(0, cooldowns[key] - 1);
  }

  for (const def of EVENT_DEFS) {
    // Skip if on cooldown
    if (cooldowns[def.id] && cooldowns[def.id] > 0) continue;

    if (def.trigger(state, ctx)) {
      narrativeEvents.push({
        id: def.id,
        titleKey: def.titleKey,
        bodyKey: def.bodyKey,
        icon: def.icon,
        severity: def.severity,
      });
      cooldowns[def.id] = MIN_COOLDOWN;
    }
  }

  return {
    ...state,
    events: allEvents,
    narrativeEvents,
    narrativeEventCooldowns: cooldowns,
  };
}
