export interface InheritanceRecord {
  cattleInherited: number;
  moneyInherited: number;
  knowledgeInherited: number;
  reputationInherited: number;
  landHealthAtTransition: number;
}

export interface GenerationState {
  chapter: number;          // Starts at 1
  yearsInChapter: number;   // 0-11
  inheritance: InheritanceRecord | null;
}
