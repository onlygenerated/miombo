// ─── Calendar ────────────────────────────────────────────────────────
export const CALENDAR = {
  START_MONTH: 10,       // October — hot-dry season, field preparation
  TURNS_PER_YEAR: 12,
  TURNS_PER_CHAPTER: 144, // 12 years
  MEETING_INTERVAL: 3,   // Quarterly community meetings
  AGM_INTERVAL: 12,      // Annual general meeting
  RAINFALL_RANGES: {
    'hot-dry': { min: 0.05, max: 0.2 },
    'rainy': { min: 0.4, max: 1.0 },
    'cool-dry': { min: 0.1, max: 0.3 },
  },
  DROUGHT_THRESHOLD: 0.2,
} as const;

// ─── Grazing ─────────────────────────────────────────────────────────
export const GRAZING = {
  INITIAL_HEALTH: 80,
  INITIAL_BIOMASS: 800,
  MAX_BIOMASS: 1000,
  LOGISTIC_GROWTH_RATE: 0.15,
  CONSUMPTION_PER_CATTLE: 8,
  SUSTAINABLE_RATE: 0.6,    // Fraction of max biomass that can be consumed
  HEALTH_RECOVERY_RATE: 0.4,
  HEALTH_DEGRADE_RATE: 2.5,
  TIPPING_POINT: 10,        // Below this: permanent capacity loss
  CAPACITY_LOSS_RATE: 0.05, // Per turn when below tipping point
  SEASONAL_GROWTH_MODIFIER: {
    'hot-dry': 0.3,
    'rainy': 1.5,
    'cool-dry': 0.7,
  },
  DEGRADATION_THRESHOLDS: [80, 60, 40, 20, 10] as readonly number[],
} as const;

// ─── Woodland ────────────────────────────────────────────────────────
export const WOODLAND = {
  INITIAL_DENSITY: 70,
  REGEN_RATES: {
    HIGH: 0.1,       // Density > 60: slow old-growth
    MID: 0.2,        // Density 20-60: coppicing regrowth
    LOW: 0.03,       // Density < 20: threshold crossed
    CRITICAL: 0.005, // Density < 5: near-irreversible
  },
  DENSITY_BANDS: {
    HIGH: 60,
    MID: 20,
    CRITICAL: 5,
  },
  FIREWOOD_EXTRACTION: 1.0,
  CHARCOAL_EXTRACTION: 2.5,    // 2.5x more destructive than firewood
  ECOSYSTEM_SERVICES_FACTOR: 0.01, // Multiplied by density for service value
} as const;

// ─── Crop ────────────────────────────────────────────────────────────
export const CROP = {
  MAIZE_STAGES: ['fallow', 'prepared', 'planted', 'growing', 'ready'] as readonly string[],
  BASE_YIELD: 40,          // Bags per field at full health
  RAIN_YIELD_BONUS: 0.5,   // Extra yield fraction in good rain
  DROUGHT_YIELD_PENALTY: 0.6, // Yield fraction during drought
  HWC_DAMAGE_MIN: 0.1,     // Min fraction of crop lost to wildlife
  HWC_DAMAGE_MAX: 0.5,     // Max fraction lost
  GROW_MONTHS: 4,          // Months from planted to ready
} as const;

// ─── Livestock ───────────────────────────────────────────────────────
export const LIVESTOCK = {
  INITIAL_CATTLE: 3,
  BIRTH_RATE: 0.08,           // Per head per year (checked monthly)
  NATURAL_DEATH_RATE: 0.02,   // Per head per year
  PREDATION_BASE_CHANCE: 0.05,// Monthly chance per head when wildlife present
  NIGHT_KRAAL_REDUCTION: 0.8, // 80% reduction in predation
  HEALTH_GRAZE_FACTOR: 0.5,   // Health gain per unit of grazing health
  STARVATION_THRESHOLD: 200,  // Biomass below which cattle starve
  STARVATION_DEATH_RATE: 0.1, // Monthly death rate when starving
  MILK_PER_CATTLE: 2,
  MANURE_PER_CATTLE: 1,
} as const;

// ─── Economy ─────────────────────────────────────────────────────────
export const ECONOMY = {
  STARTING_MONEY: 500_000,  // Kwacha
  PRICES: {
    maize: 150,
    cattle: 8000,
    firewood: 50,
    charcoal: 200,
    milk: 30,
    manure: 20,
    seeds: 100,
  },
  PRICE_VARIATION: 0.15, // +/- 15% random variation
  TREND_SHIFT_INTERVAL: 4, // Turns between potential trend changes
} as const;

// ─── Governance ──────────────────────────────────────────────────────
export const GOVERNANCE = {
  INITIAL_TRUST: 40,
  INITIAL_COHESION: 45,
  INITIAL_MONITORING: 20,
  INITIAL_TA_RELATION: 50,
  TRUST_MEETING_BONUS: 3,
  TRUST_VIOLATION_PENALTY: 5,
  TRUST_SANCTION_BONUS: 2,
  COHESION_MEETING_BONUS: 2,
  COHESION_INEQUALITY_PENALTY: 3,
  MONITORING_PATROL_BONUS: 5,
  MONITORING_DECAY: 1,       // Decays per turn without action
  COMPLIANCE_LOCAL_BONUS: 15, // Locally-defined rules get +15 compliance
} as const;

// ─── Wildlife ────────────────────────────────────────────────────────
export const WILDLIFE = {
  INITIAL_PRESENCE: 40,
  PRESENCE_WOODLAND_FACTOR: 0.8, // Presence tracks woodland density
  HWC_CROP_CHANCE_BASE: 0.05,    // Monthly base chance of crop raid
  HWC_LIVESTOCK_CHANCE_BASE: 0.05,
  CHILLI_FENCE_REDUCTION: 0.6,   // 60% reduction in crop raids
  CROP_LAYOUT_REDUCTION: 0.3,    // 30% reduction
  COORDINATED_GUARD_REDUCTION: 0.5,
} as const;

// ─── Player ──────────────────────────────────────────────────────────
export const PLAYER = {
  STARTING_REPUTATION: 50,
  STARTING_KNOWLEDGE: 30,
  STARTING_WELLBEING: 60,
  STARTING_FIELDS: 2,
  MAX_FIELDS: 5,
  STARTING_STORES: {
    grain: 30,
    firewood: 10,
    charcoal: 0,
    manure: 5,
    seeds: 10,
    milk: 0,
  },
  ACTIONS_PER_TURN: 2,
} as const;

// ─── Neighbor Archetypes ─────────────────────────────────────────────
export const NEIGHBOR_ARCHETYPES = [
  {
    id: 'mubita',
    name: 'Mubita',
    wealth: 'wealthy' as const,
    cattle: 8,
    traits: { greed: 0.8, caution: 0.3, social: 0.2, adaptability: 0.4 },
    description: 'Wealthy farmer — elite capture risk',
  },
  {
    id: 'nasilele',
    name: 'Nasilele',
    wealth: 'middle' as const,
    cattle: 4,
    traits: { greed: 0.3, caution: 0.5, social: 0.8, adaptability: 0.6 },
    description: 'Cooperative community member',
  },
  {
    id: 'inonge',
    name: 'Inonge',
    wealth: 'poor' as const,
    cattle: 1,
    traits: { greed: 0.5, caution: 0.6, social: 0.5, adaptability: 0.3 },
    description: 'Desperation-driven non-compliance',
  },
] as const;

// ─── Action Costs ───────────────────────────────────────────────────
export const ACTION_COSTS = {
  CHILLI_FENCE_COST: 2000,    // Kwacha
  NIGHT_KRAAL_COST: 1500,
  CROP_LAYOUT_COST: 1000,
  FIREWOOD_YIELD: 3,          // Units of firewood per extraction action
  CHARCOAL_YIELD: 2,          // Units of charcoal per extraction action
  TEND_CROPS_BONUS: 10,       // Field health bonus for tending
  REST_WELLBEING_BONUS: 5,
  REST_HEALTH_BONUS: 3,
  SEEDS_PER_PLANT: 2,         // Seeds consumed per field planted
  GRAZE_HEALTH_BONUS: 5,      // Cattle health bonus from active grazing
  PATROL_REPUTATION_BONUS: 3,
  MEETING_KNOWLEDGE_BONUS: 2,
} as const;

// ─── Generation ──────────────────────────────────────────────────────
export const GENERATION = {
  CATTLE_INHERITANCE: 0.7,      // 60-80% range, use 70% midpoint
  MONEY_INHERITANCE: 0.5,
  KNOWLEDGE_INHERITANCE: 0.75,
  REPUTATION_INHERITANCE: 0.5,
} as const;
