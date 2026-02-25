export interface PersonalityTraits {
  greed: number;        // 0-1
  caution: number;      // 0-1
  social: number;       // 0-1
  adaptability: number; // 0-1
}

export type WealthLevel = 'wealthy' | 'middle' | 'poor';

export interface NeighborState {
  id: string;
  name: string;
  wealth: WealthLevel;
  cattle: number;
  traits: PersonalityTraits;
  reputation: number;    // 0-100
  desperation: number;   // 0-100
  compliance: number;    // 0-100, how well they follow community rules
}
