export type RuleType =
  | 'grazing-limit'
  | 'woodland-quota'
  | 'rotational-grazing'
  | 'no-burn-zone'
  | 'harvest-season'
  | 'technology-limit'
  | 'zonation';

export type SanctionLevel = 'social-pressure' | 'warning' | 'fine' | 'exclusion';

export type BenefitDistribution = 'none' | 'community-project' | 'household-dividend' | 'mixed';

export interface CommunityRule {
  type: RuleType;
  details: { limit?: number; zone?: string };
  votedFor: number;
  votedAgainst: number;
  compliance: number;       // 0-100
  turnsActive: number;
  locallyDefined: boolean;
}

export interface SanctionRecord {
  targetId: string;
  level: SanctionLevel;
  rule: string;
  turn: number;
}

export interface GovernanceState {
  rules: CommunityRule[];
  communityTrust: number;           // 0-100
  socialCohesion: number;           // 0-100
  sharedFund: number;               // Kwacha
  meetingCooldown: number;          // Turns until next meeting
  monitoringLevel: number;          // 0-100
  traditionalAuthorityRelation: number; // 0-100
  exclusionRights: boolean;
  benefitDistribution: BenefitDistribution;
  sanctionHistory: SanctionRecord[];
}
