export interface GrazingState {
  health: number;           // 0-100
  biomass: number;
  maxBiomass: number;
  degradationLevel: number; // 0-4 (pristine to desertified)
}

export interface WoodlandState {
  density: number;           // 0-100
  hectares: number;
  regenerationRate: number;
  ecosystemServices: number; // Derived from density
  veldProducts: number;      // Derived from density
}

export interface WildlifeState {
  presence: number;         // 0-100
  hwcPressure: number;      // 0-100
  recentEvents: string[];
}

export interface ZoneMap {
  cropFields: number;
  communalGrazing: number;
  woodlandReserve: number;
  settlement: number;
}

export interface CommunalState {
  grazing: GrazingState;
  woodland: WoodlandState;
  wildlife: WildlifeState;
  zonation: ZoneMap;
  governance: GovernanceState;
}

// Re-export GovernanceState so CommunalState is self-contained
import type { GovernanceState } from './Governance.js';
export type { GovernanceState };
