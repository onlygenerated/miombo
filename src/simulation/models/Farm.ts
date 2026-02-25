export type CropStage = 'fallow' | 'prepared' | 'planted' | 'growing' | 'ready';

export interface Field {
  id: number;
  stage: CropStage;
  health: number;       // 0-100
  monthsInStage: number;
}

export interface LivestockState {
  cattle: number;
  health: number;       // 0-100
}

export interface StoresState {
  grain: number;
  firewood: number;
  charcoal: number;
  manure: number;
  seeds: number;
  milk: number;
}

export interface HwcMitigationState {
  chilliFence: boolean;
  nightKraal: boolean;
  cropLayout: boolean;
}

export interface PlayerState {
  fields: Field[];
  livestock: LivestockState;
  stores: StoresState;
  money: number;
  reputation: number;    // 0-100
  knowledge: number;     // 0-100
  wellbeing: number;     // 0-100
  hwcMitigation: HwcMitigationState;
}
