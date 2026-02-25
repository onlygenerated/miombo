import type { CalendarState } from './models/Season.js';
import type { PlayerState } from './models/Farm.js';
import type { CommunalState } from './models/CommunalLand.js';
import type { NeighborState } from './models/Neighbor.js';
import type { EconomyState } from './models/Economy.js';
import type { GenerationState } from './models/Generation.js';
import type { NarrativeEvent } from './models/NarrativeEvent.js';
import type { RngState } from './utils/random.js';
import { createRng } from './utils/random.js';
import { getSeasonForMonth } from './models/Season.js';
import {
  CALENDAR, GRAZING, WOODLAND, ECONOMY, GOVERNANCE,
  WILDLIFE, PLAYER, NEIGHBOR_ARCHETYPES, LIVESTOCK,
} from '../config.js';

export interface GameState {
  calendar: CalendarState;
  player: PlayerState;
  communal: CommunalState;
  neighbors: NeighborState[];
  economy: EconomyState;
  generation: GenerationState;
  events: string[];
  narrativeEvents: NarrativeEvent[];
  narrativeEventCooldowns: Record<string, number>;
  rng: RngState;
}

/** Create a fresh game state. Same seed = identical state. */
export function createInitialState(seed: number = 1): GameState {
  const startMonth = CALENDAR.START_MONTH;
  const season = getSeasonForMonth(startMonth);

  const fields = Array.from({ length: PLAYER.STARTING_FIELDS }, (_, i) => ({
    id: i,
    stage: 'fallow' as const,
    health: 100,
    monthsInStage: 0,
  }));

  const neighbors: NeighborState[] = NEIGHBOR_ARCHETYPES.map((arch) => {
    const desperationByWealth = { wealthy: 10, middle: 30, poor: 60 };
    return {
      id: arch.id,
      name: arch.name,
      wealth: arch.wealth,
      cattle: arch.cattle,
      traits: { ...arch.traits },
      reputation: 50,
      desperation: desperationByWealth[arch.wealth],
      compliance: 50,
    };
  });

  return {
    calendar: {
      month: startMonth,
      year: 1,
      season,
      turn: 0,
      rainfall: 0.5,
      drought: false,
    },
    player: {
      fields,
      livestock: {
        cattle: LIVESTOCK.INITIAL_CATTLE,
        health: 70,
      },
      stores: { ...PLAYER.STARTING_STORES },
      money: ECONOMY.STARTING_MONEY,
      reputation: PLAYER.STARTING_REPUTATION,
      knowledge: PLAYER.STARTING_KNOWLEDGE,
      wellbeing: PLAYER.STARTING_WELLBEING,
      hwcMitigation: {
        chilliFence: false,
        nightKraal: false,
        cropLayout: false,
      },
    },
    communal: {
      grazing: {
        health: GRAZING.INITIAL_HEALTH,
        biomass: GRAZING.INITIAL_BIOMASS,
        maxBiomass: GRAZING.MAX_BIOMASS,
        degradationLevel: 0,
      },
      woodland: {
        density: WOODLAND.INITIAL_DENSITY,
        hectares: 500,
        regenerationRate: WOODLAND.REGEN_RATES.HIGH,
        ecosystemServices: WOODLAND.INITIAL_DENSITY * WOODLAND.ECOSYSTEM_SERVICES_FACTOR,
        veldProducts: WOODLAND.INITIAL_DENSITY * 0.5,
      },
      wildlife: {
        presence: WILDLIFE.INITIAL_PRESENCE,
        hwcPressure: 20,
        recentEvents: [],
      },
      zonation: {
        cropFields: 20,
        communalGrazing: 40,
        woodlandReserve: 30,
        settlement: 10,
      },
      governance: {
        rules: [],
        communityTrust: GOVERNANCE.INITIAL_TRUST,
        socialCohesion: GOVERNANCE.INITIAL_COHESION,
        sharedFund: 0,
        meetingCooldown: 0,
        monitoringLevel: GOVERNANCE.INITIAL_MONITORING,
        traditionalAuthorityRelation: GOVERNANCE.INITIAL_TA_RELATION,
        exclusionRights: false,
        benefitDistribution: 'none',
        sanctionHistory: [],
      },
    },
    neighbors,
    economy: {
      prices: { ...ECONOMY.PRICES },
      trend: 'stable',
    },
    generation: {
      chapter: 1,
      yearsInChapter: 0,
      inheritance: null,
    },
    events: [],
    narrativeEvents: [],
    narrativeEventCooldowns: {},
    rng: createRng(seed),
  };
}
