export type Commodity = 'maize' | 'cattle' | 'firewood' | 'charcoal' | 'milk' | 'manure' | 'seeds';

export type PriceTrend = 'rising' | 'stable' | 'falling';

export interface EconomyState {
  prices: Record<Commodity, number>;
  trend: PriceTrend;
}
