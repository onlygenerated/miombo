# Miombo — Game Prototype Plan

## Context

Miombo is a turn-based resource management game set in western Zambia that teaches sustainable farming, communal resource stewardship, and collective action. The target audience is local farming communities (with NGO support for distribution/training). The game must work offline on low-end Android phones with minimal text, using visual-first design to accommodate limited literacy.

The prototype proves the core loop: a farmer making monthly decisions about crops, livestock, and shared resources (grazing land, Miombo woodland) while AI neighbors create "tragedy of the commons" pressure. Multi-generational play shows how today's decisions shape tomorrow's land.

The game design is grounded in three frameworks:
- **13 CPRM principles** combining Ostrom (1990), Cox et al. (2010), and Murphree (1991) — the combined southern African framework for governing commons
- **WWF CBNRM best practices** (2006 manual + 2017 practitioner's guide) — community governance, benefit-sharing, rights security, adaptive management, monitoring
- **Collective Impact** (external actors as event modifiers — NGOs, government, private sector)

### Research Foundations

The design draws directly from two WWF documents in `Research/`:

1. **CBNRM Manual (2006)** — 77-page training manual covering institutional development, resource management, financial management, and M&E across Botswana, Namibia, Zambia, and Zimbabwe. Key case studies: Luangwa Valley (Zambia), CAMPFIRE (Zimbabwe), Chobe Enclave (Botswana), Namibian conservancies.

2. **Best Practices for CBNRM (2017)** — 21-page practitioner's guide with 43 best practices organized around bottom-up empowerment, policy reform, programmatic approach, funding, monitoring/adaptive management, and markets/benefits.

**Core distinction the game teaches:** Common Property Resource Management (CPRM) vs. Open Access. In CPRM, a defined group has the right to exclude others and jointly makes/enforces management rules. In Open Access (Hardin's "tragedy"), no one has management authority, so each individual maximizes extraction before others do. The game's central arc is transforming an open-access situation into functional common property management through collective action.

---

## Tech Stack

- **Phaser 3** (HTML5 game framework) + **TypeScript** + **Vite**
- **PWA** with service worker for offline play
- Installable on Android via "Add to Home Screen"
- All game state in `localStorage` (auto-save each turn)

---

## Architecture: Simulation / Rendering Separation

Everything in `src/simulation/` is **pure TypeScript with zero Phaser imports**. This is the most important architectural rule — it enables unit testing, portability, and clean reasoning about game logic.

```
miombo/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── manifest.json                 # PWA manifest
├── sw.ts                         # Service worker (Workbox)
├── public/
│   ├── icons/                    # PWA icons
│   ├── assets/
│   │   ├── sprites/              # Tile sprites, livestock, crops, UI icons
│   │   └── ui/                   # Decision cards, buttons, HUD
│   └── locales/
│       ├── en.json               # English (prototype)
│       ├── lz.json               # Lozi (placeholder)
│       └── bm.json               # Bemba (placeholder)
├── src/
│   ├── main.ts                   # Phaser config + bootstrap
│   ├── config.ts                 # Game constants / tuning knobs
│   │
│   ├── simulation/               # *** PURE TS — NO PHASER ***
│   │   ├── GameState.ts          # Master state (serializable)
│   │   ├── TurnEngine.ts         # Turn pipeline orchestrator
│   │   ├── models/               # Data interfaces
│   │   │   ├── Farm.ts           # Fields, livestock, stores
│   │   │   ├── CommunalLand.ts   # Grazing + woodland
│   │   │   ├── Neighbor.ts       # AI farmer
│   │   │   ├── Season.ts         # Calendar, weather
│   │   │   ├── Economy.ts        # Market prices
│   │   │   ├── Generation.ts     # Chapter/inheritance
│   │   │   └── Governance.ts     # Community rules, meetings, sanctions
│   │   ├── systems/
│   │   │   ├── GrazingSystem.ts
│   │   │   ├── WoodlandSystem.ts
│   │   │   ├── CropSystem.ts
│   │   │   ├── LivestockSystem.ts
│   │   │   ├── WildlifeSystem.ts     # HWC events, wildlife presence tied to habitat
│   │   │   ├── WeatherSystem.ts
│   │   │   ├── EconomySystem.ts
│   │   │   ├── NeighborAISystem.ts
│   │   │   ├── GovernanceSystem.ts   # CPRM-informed community mechanics
│   │   │   └── EventSystem.ts
│   │   ├── actions/
│   │   │   ├── PlayerAction.ts
│   │   │   └── ActionResolver.ts
│   │   └── utils/
│   │       ├── random.ts         # Seeded PRNG
│   │       └── clamp.ts
│   │
│   ├── scenes/
│   │   ├── BootScene.ts
│   │   ├── PreloadScene.ts
│   │   ├── MenuScene.ts
│   │   ├── GameScene.ts          # Main top-down map view
│   │   ├── HUDScene.ts           # Resource bar overlay
│   │   ├── DecisionScene.ts      # Action card selection
│   │   ├── MeetingScene.ts       # Community governance meetings
│   │   ├── EventScene.ts         # Narrative panels
│   │   ├── SummaryScene.ts       # Year-end / chapter-end
│   │   └── GameOverScene.ts
│   │
│   ├── ui/                       # Reusable Phaser UI components
│   ├── rendering/                # State → visual bridge
│   ├── i18n/
│   │   ├── I18n.ts               # JSON string table loader
│   │   └── keys.ts               # Type-safe key constants
│   └── persistence/
│       └── SaveManager.ts        # localStorage save/load
│
└── tests/
    └── simulation/               # Unit tests for core systems
```

---

## Core Data Model

### GameState (top-level, fully serializable)

```
GameState
├── turn: number (month counter)
├── calendar: { month, year, season, rainfall, drought }
├── player: PlayerState
│   ├── fields: Field[] (2 starting, max 5)
│   ├── livestock: { cattle, chickens, health }
│   ├── stores: { grain, firewood, charcoal, manure, seeds, milk }
│   ├── money: number (Kwacha)
│   ├── reputation: 0-100
│   ├── knowledge: 0-100
│   ├── wellbeing: 0-100
│   └── hwcMitigation: { chilliFence, nightKraal, cropLayout }
├── communal: CommunalState
│   ├── grazing: { health, biomass, maxBiomass, degradationLevel 0-4 }
│   ├── woodland: { density, hectares, regenerationRate, ecosystemServices, veldProducts }
│   ├── wildlife: { presence 0-100, hwcPressure, recentEvents }
│   ├── zonation: ZoneMap (which tiles assigned to which land use)
│   └── governance: GovernanceState
│       ├── rules: CommunityRule[]
│       ├── meetingSchedule: next meeting turn
│       ├── communityTrust: 0-100
│       ├── sanctionHistory: SanctionRecord[]
│       └── sharedFund: number (Kwacha from fines/collective sales)
├── neighbors: NeighborState[] (3 AI farmers)
├── economy: { prices, trend }
├── generation: { chapter, yearsInChapter, inheritance }
├── events: GameEvent[]
└── rng: seed state
```

### Governance Model (CPRM-Informed)

Community governance is a living system grounded in the 13 CPRM principles derived from Ostrom (1990), Cox et al. (2010), and Murphree's southern African principles (1991). It models trust, monitoring, graduated sanctions, participatory rule-making, benefit distribution, and the tension between traditional authority and elected institutions.

```typescript
interface GovernanceState {
  rules: CommunityRule[];
  communityTrust: number;         // 0-100, collective trust level
  socialCohesion: number;         // 0-100, shared values/willingness to cooperate
  sharedFund: number;             // Kwacha from fines, collective sales, partnerships
  meetingCooldown: number;        // Turns until next meeting allowed
  monitoringLevel: number;        // 0-100, how well rules are enforced
  traditionalAuthorityRelation: number; // 0-100, alignment with headman/chief
  exclusionRights: boolean;       // Can community exclude outsiders?
  benefitDistribution: 'none' | 'community-project' | 'household-dividend' | 'mixed';
}

interface CommunityRule {
  type: 'grazing-limit' | 'woodland-quota' | 'rotational-grazing'
      | 'no-burn-zone' | 'harvest-season' | 'technology-limit' | 'zonation';
  details: { limit?: number; zone?: string };
  votedFor: number;
  votedAgainst: number;
  compliance: number;             // 0-100
  turnsActive: number;
  locallyDefined: boolean;        // Rules defined locally have higher compliance
}

interface SanctionRecord {
  targetId: string;               // Player or neighbor
  level: 'social-pressure' | 'warning' | 'fine' | 'exclusion';
  rule: string;
  turn: number;
}
```

**Design note on sanctions:** Research shows compliance in real CBNRM comes primarily from **social pressure** within the community, not formal penalties (fines, imprisonment). Social pressure is the default first sanction level. Formal penalties only escalate when social pressure fails.

**How the 13 CPRM principles manifest:**

| CPRM Principle (Ostrom/Cox/Murphree) | Game Mechanic |
|---|---|
| 1. Clear resource boundaries | Map zonation — communal grazing, woodland, private fields clearly demarcated |
| 2. Defined community | Player + 3 neighbors = the resource management group; outsider pressure events |
| 3. Exclusion of others | Action: establish boundary patrols; event: outsiders encroach if unguarded |
| 4. Recognition of rights | Governance milestone: community gains formal management authority (unlocks advanced rules) |
| 5. Small decision units | Village-level decisions at quarterly meetings (4-5 participants) |
| 6. Nested institutions | Household decisions nest within community rules; post-prototype: inter-village cooperation |
| 7. Benefits outweigh costs | Core economic loop — management costs (time, actions) vs. resource yields |
| 8. Benefits increase with management | Better-managed land → higher yields, healthier livestock, ecosystem services |
| 9. Resource monitoring by users | Player action: patrol/monitor (uses Event Book system — tracks resource trends) |
| 10. Accountable local monitors | Monitors report to community meeting, not external authority |
| 11. Locally appropriate rules | Player-proposed rules have higher compliance than externally imposed ones |
| 12. Graduated sanctions | Social pressure → warning → fine → temporary exclusion from commons |
| 13. Accessible conflict resolution | Meeting sub-event: mediate disputes between neighbors over resource use |

### Benefit Distribution Model

Research (WWF 2006, CAMPFIRE/Zimbabwe) shows benefit distribution is a critical governance mechanic:

- **Household dividends** — direct payments ensure equity (pioneered in Chikwarawara Village, 1992). Higher buy-in from community members.
- **Community projects** — infrastructure investments (borehole, grain store, school materials). Benefits certain sectors more than others, risking perception of unfairness.
- **Mixed** — partial dividends + partial community investment. Most flexible.
- **Timing matters** — payments during school fee season or drought have greater impact.
- **Elite capture risk** — if traditional authority or committee captures benefits, trust collapses.

In-game, the player votes on distribution method at meetings. Each method has different effects on `communityTrust`, `socialCohesion`, and individual neighbor satisfaction.

### Traditional Authority

Research documents highlight persistent tension between traditional leaders (chiefs, headmen) and modern elected committees. In-game:

- `traditionalAuthorityRelation` tracks alignment with the village headman (NPC)
- Consulting the headman before proposing rules increases `compliance` and `communityTrust`
- Ignoring the headman risks rule sabotage (lower compliance, higher violation rate)
- The headman has land allocation influence — affects whether player can expand fields

---

## Turn Pipeline

Each turn = 1 month. Player gets 2-3 action slots.

```
1. WEATHER        → Generate rainfall, check drought
2. PLAYER ACTIONS → Player picks 1-3 actions from cards
3. NEIGHBOR AI    → Each AI neighbor decides actions
4. RESOLUTION     → All actions applied simultaneously:
   a. CropSystem       — fields advance states
   b. LivestockSystem   — herd health/growth
   c. GrazingSystem     — communal land pressure + recovery
   d. WoodlandSystem    — extraction + regeneration + veld products
   e. WildlifeSystem    — HWC events based on habitat quality + mitigation
   f. EconomySystem     — market transactions
   g. GovernanceSystem  — rule compliance, sanctions, trust, benefit distribution
5. EVENTS         → Check triggers for narrative events
6. CALENDAR       → Advance month; check year-end / chapter-end
```

### Seasonal Action Availability

| Season | Months | Key Actions |
|---|---|---|
| Hot-dry | Oct, Aug-Sep | Prepare fields, market, charcoal, community meetings |
| Rainy | Nov-Mar | Plant, tend, graze (good pasture), limited woodland work |
| Cool-dry | Apr-Jul | Harvest, sell crops, firewood, build/repair |

### Community Meetings (every ~3 months, tied to seasonal breaks)

Modeled on real CBNRM institutional structures: quarterly committee meetings + annual general meetings (AGM). Real-world examples include Zambia's Village Action Groups (VAGs) that meet "under a tree" — small enough that all members know each other.

Meetings are a special turn event where:
1. **Resource report** — current grazing health, woodland density, wildlife sightings (Event Book data)
2. **Monitoring report** — violations detected since last meeting, with evidence quality based on `monitoringLevel`
3. **Rule proposals** — player or neighbor proposes a new rule; locally-defined rules get higher compliance
4. **Voting** — all participants vote (personality-driven for AI; headman's opinion carries weight)
5. **Sanctions** — graduated: social pressure → warning → fine → temporary exclusion
6. **Benefit distribution** — how to allocate shared fund (dividends vs. projects)
7. **Financial transparency** — shared fund balance shown; mismanagement detected if monitoring is high

**Annual General Meeting (every 12 turns):** Special expanded meeting with elections, annual financial review, and long-term planning. Can change leadership roles and distribution method.

---

## Simulation Models

### Grazing Land (logistic growth with tipping point)

- Biomass recovers via logistic growth, modified by season and rainfall
- `health` variable acts as land memory — degrades when overgrazed, recovers slowly
- **Tipping point at health < 10**: permanent capacity loss (desertification)
- 5 visual degradation levels: pristine → light → moderate → severe → desertified

Key formula: `overgrazeIntensity = (totalConsumption - sustainableRate) / sustainableRate`

### Woodland (Miombo ecology)

- Density 0-100 with regeneration rates that vary by density band
- Density > 60: slow old-growth regeneration (0.1/month)
- Density 20-60: faster resprouting regrowth (0.2/month) — matches real Miombo coppicing
- Density < 20: **threshold crossed**, very slow recovery (0.03/month)
- Density < 5: near-irreversible loss (0.005/month)
- Ecosystem services (water retention, soil protection, wild foods) derived from density
- Charcoal production is highly profitable but 2-3x more destructive than firewood
- **Veld products** (food, medicines, building materials, thatching grass) — important supplementary livelihood, especially during drought or unemployment. Derived from woodland density.

### Human-Wildlife Conflict (HWC)

Research identifies HWC as a central challenge in CBNRM — as wildlife recovers under good management, conflict costs rise. This creates a teaching dilemma: success breeds new problems.

- **Crop raiding events** — triggered by woodland density (more habitat = more wildlife). Elephants, hippos, baboons damage crops. Maize and millet are most vulnerable.
- **Livestock predation** — lion, hyena events increase with woodland health. Cattle kraaled at night reduce losses.
- **Mitigation actions** available to player:
  - *Chilli fencing* (low cost, medium effectiveness — real technique from Zimbabwe/Zambia)
  - *Night kraaling* (free, prevents most livestock predation)
  - *Coordinated guarding* (community action — requires cooperation with neighbors)
  - *Crop layout planning* (plant unpalatable crops at field edges — cotton, chilli peppers)
- **Compensation schemes** — can be proposed at meetings; historically ineffective for crops (expensive, no incentive to prevent) but workable for livestock with conditions
- **Paradox mechanic**: healthy woodland = more ecosystem services AND more HWC. Player must balance.

### Zonation (Land Use Planning)

Research emphasizes zonation as a key management tool — separating conflicting land uses into designated areas.

- Map zones: crop fields, communal grazing, woodland reserve, settlement area
- Advanced rule type: player can propose zonation rules at meetings (e.g., "no-harvest core zone" in woodland)
- Zonation reduces conflict between uses but requires compliance and monitoring
- Good zonation → higher productivity per zone; poor zonation → competing uses degrade all zones

### AI Neighbors (personality-weighted scoring)

Each neighbor has personality traits: `greed`, `caution`, `social`, `adaptability`

Additionally, neighbors have **wealth levels** (research shows 10% of households can control 60% of assets in real communities). Wealthier neighbors have more cattle (more grazing pressure) and more influence in meetings, but also more to lose from degradation.

Decision scoring: each possible action gets a weighted score based on:
- Personality traits (base tendency)
- Wealth level (wealthier neighbors can absorb short-term costs; poorer neighbors are more desperate)
- Communal land state (react to degradation)
- Active community rules (compliance vs. violation — locally-defined rules get higher compliance)
- Social pressure from community (high `socialCohesion` → neighbors conform more)
- Desperation level (overrides cooperation when high — reflects research finding that subsistence needs override conservation)
- Relationship with traditional authority (headman-aligned neighbors comply more)
- Small random perturbation for variety

**Emergent tragedy**: Desperate neighbors overgraze → land degrades → more neighbors become desperate → spiral. Player must break this through collective action.

**Emergent cooperation**: Good governance → social pressure works → compliance rises → resources recover → benefits increase → more cooperation. The positive feedback loop that CBNRM research documents as the goal.

### Governance System

Modeled on the adaptive management cycle from research: set objectives → manage → monitor → evaluate → modify.

**Trust dynamics:**
- `communityTrust` increases when: rules are followed, meetings happen regularly, sanctions are proportionate, benefits are distributed transparently, headman is consulted
- `communityTrust` decreases when: violations go unpunished, rules are ignored, externally imposed rules override local ones, elite capture occurs, financial mismanagement
- High trust → neighbors more likely to cooperate and comply; social pressure alone deters most violations
- Low trust → rules collapse, free-riding increases, open access conditions return

**Social cohesion:**
- `socialCohesion` reflects shared values and willingness to work together (research: "a self-defined group with common interest in managing the resource together")
- Increases through: successful meetings, equitable benefit distribution, shared crisis response (drought cooperation)
- Decreases through: wealth inequality growing, elite capture, unfair sanctions, prolonged hardship

**Monitoring (Event Book system):**
- Inspired by Namibia's real-world Event Book system: community monitors record standardized data (rainfall, fire, animal sightings, poaching, rangeland condition) in simple visual formats
- `monitoringLevel` increases when player (or neighbors) spend actions on monitoring/patrolling
- Higher monitoring → violations more likely detected → sanctions applied → deterrence
- Monitoring data feeds into meeting reports — better data enables better rule-making
- In-game: monitoring action produces a visual trend indicator (simple up/down arrows for resource health) shown at meetings

**Adaptive management feedback:**
- Rules can be modified at meetings based on monitoring data
- Rules that don't match current conditions (e.g., grazing limit too low when pasture is healthy) can be relaxed
- Research emphasizes: "failures should not be considered disasters" — wrong rules can be changed

**Net benefit calculation:**
- Research principle: "benefits from collective management must outweigh costs." If management costs (time spent in meetings, monitoring, reduced access) exceed perceived benefits, participation collapses.
- In-game: if player spends too many actions on governance without visible improvement, neighbors disengage

---

## Generation / Chapter System

Each chapter = ~12 game years (144 turns). At chapter end:

1. **Summary scene** shows land change over the generation (before/after comparison)
2. **Inheritance**: Next generation receives:
   - 60-80% of cattle
   - 50% of money
   - Land in current state (the big one — degraded or healthy)
   - 75% of knowledge (techniques carry forward)
   - 50% of reputation
   - Communal land in current state (shared inheritance)
   - Governance state carries forward (rules, trust level)
3. **New chapter narrative** frames the next generation's context
4. Population pressure increases slightly each chapter (more neighbors, more demand)
5. Governance institutions carry forward but may weaken (research: institutions need ongoing maintenance)
6. **HIV/AIDS impact** (post-prototype): research notes 29.4M affected in sub-Saharan Africa; could model as labor loss events reducing available actions per turn

---

## Scene Flow

```
Boot → Preload → Menu
                   ↓
              GameScene + HUD (main loop)
                   ↓
         tap "Plan Turn" → DecisionScene (pick actions)
                   ↓
              confirm → resolution animation
                   ↓
         if event triggered → EventScene (narrative panel)
         if meeting due → MeetingScene (governance)
         if year-end → SummaryScene
         if chapter-end → SummaryScene (inheritance)
                   ↓
              back to GameScene
```

### Main Game View (320-400px width)

```
┌─────────────────────────┐
│ [Mon] [Season]     [K$] │  HUD top bar
│ [cattle 5] [grain 30] [heart 72] │  Resource icons
├─────────────────────────┤
│                         │
│   TOP-DOWN TILE MAP     │  Scrollable/pannable
│   · Player fields       │  Color-coded health
│   · Communal grazing    │  Green→yellow→brown→grey
│   · Woodland edge       │  Dense→sparse→bare
│   · Neighbor farms      │
│                         │
├─────────────────────────┤
│ [Plan Turn] [Map] [Menu]│  Bottom bar
└─────────────────────────┘
```

### Narrative Panels

Key decision points and events use illustrated card panels (localized content):
- Drought warnings, neighbor conflicts, wildlife encounters
- **HWC events** — elephants in the maize field, lion taking cattle, baboon crop raids
- Community meeting outcomes
- Generation transitions
- Teaching moments about specific practices (chilli fencing, night kraaling, rotational grazing, fire management)
- **Outsider events** — herders from outside the community graze on commons (tests exclusion rights)
- **Government events** — external rules imposed (lower compliance than locally-defined rules)
- **Market opportunity events** — craft sales, tourism partnership offer, veld product demand

---

## Localization

All player-visible text in `public/locales/{lang}.json`. Flat key structure with `{0}`, `{1}` parameter substitution. `I18n.t(key, ...args)` used everywhere. English for prototype; Lozi/Bemba placeholders from day one.

Design principle: **icons and color carry primary meaning, text is supplementary**. A player who can't read should still understand that brown grazing land is bad and green is good.

---

## Prototype Scope

### Build (MVP)

- Turn engine with full pipeline
- Grazing + woodland simulation (the educational core)
- Crop system (maize only)
- Livestock system (cattle only)
- 3 AI neighbors with personality-driven decisions + wealth levels
- Weather system (seasonal rainfall, simple drought)
- Governance system: community meetings, rule voting, graduated sanctions (social pressure first), monitoring (Event Book inspired), benefit distribution vote, traditional authority NPC
- HWC events (crop raiding, livestock predation) with mitigation actions (chilli fence, night kraaling)
- Zonation as an advanced rule type
- 1 generation chapter (12 years)
- Tile map view with color-coded health and zone boundaries
- HUD with resource icons
- Decision card UI
- Meeting scene for governance (quarterly + AGM)
- 5-8 narrative events
- Year-end summary
- Save/load (localStorage)
- PWA manifest + service worker
- i18n system (English, with placeholders)
- Seeded PRNG

### Defer

- Multiple crop types (cassava, groundnuts, vegetables)
- Chickens
- Veld products as harvestable resource (architecture ready — derived from woodland density)
- Full 3-generation campaign
- Animated sprites (use colored rectangles + icons for prototype)
- Sound/audio
- External actor events (NGOs, government, private sector partnerships) — architecture supports, content deferred
- Tourism/trophy hunting joint ventures as income source
- Outsider encroachment events (exclusion rights mechanic)
- Inter-village nested governance (landscape-scale cooperation)
- Cloud save, analytics
- Lozi/Bemba translations (architecture ready)

### Placeholder/Simplified

- Sprites: colored rectangles with icon overlays
- Neighbor farms: small colored squares at map edge
- Market prices: fixed with small random variation
- Weather: random within seasonal ranges
- Audio: none

---

## Build Sequence

**Phase 1: Foundation (Days 1-2)**
1. Scaffold: Vite + Phaser 3 + TypeScript
2. All type definitions in `src/simulation/models/`
3. GameState initializer (fresh game)
4. Calendar + seasonal logic
5. Seeded PRNG, config constants

**Phase 2: Core Simulation (Days 3-5)**
6. GrazingSystem (degradation/recovery with tipping point)
7. WoodlandSystem (depletion/regeneration with threshold)
8. CropSystem (maize: prepare → plant → grow → harvest)
9. LivestockSystem (cattle health, births, deaths)
10. WeatherSystem (seasonal rainfall)
11. NeighborAISystem (3 neighbors, personality-weighted)
12. GovernanceSystem (rules, meetings, sanctions, trust)
13. TurnEngine composing all systems
14. **Unit tests for Grazing, Woodland, Governance**

**Phase 3: Scenes + Rendering (Days 6-9)**
15. Boot + Preload scenes
16. Menu scene (new/continue)
17. GameScene with tile map
18. HUD overlay
19. DecisionScene (action cards)
20. MeetingScene (governance UI)
21. Connect TurnEngine → scene flow
22. SummaryScene (year-end)

**Phase 4: Polish + Infrastructure (Days 10-12)**
23. i18n system + en.json
24. SaveManager (auto-save)
25. PWA manifest + service worker
26. Narrative events (5-8 with triggers)
27. Generation/chapter transition
28. Playtest and balance tuning

---

## Critical Files

| File | Why Critical |
|---|---|
| `src/simulation/GameState.ts` | Master state shape — everything depends on this |
| `src/simulation/TurnEngine.ts` | Orchestrates all systems per turn |
| `src/simulation/systems/GrazingSystem.ts` | Primary ecological model, educational core |
| `src/simulation/systems/WoodlandSystem.ts` | Miombo deforestation model with thresholds + veld products |
| `src/simulation/systems/GovernanceSystem.ts` | CPRM-informed community mechanics — the "collective action" core |
| `src/simulation/systems/WildlifeSystem.ts` | HWC events, conservation paradox mechanic |
| `src/simulation/systems/NeighborAISystem.ts` | Creates emergent tragedy of the commons + cooperation |
| `src/scenes/GameScene.ts` | Main view, must work on 320px screens |
| `src/scenes/MeetingScene.ts` | Community governance UI — where collective decisions happen |
| `src/config.ts` | All tuning knobs for balance |

---

## Verification

1. **Unit tests**: Run `npm test` — GrazingSystem, WoodlandSystem, GovernanceSystem, WildlifeSystem must pass
2. **Tragedy test**: Run 144 turns (1 chapter) with no player input (all "rest") — verify land degrades from neighbor pressure alone (open access tragedy emerges)
3. **Cooperation test**: Run 144 turns with active governance (propose rules, monitor, attend meetings) — verify land health stabilizes or improves (CPRM success)
4. **HWC paradox test**: Run cooperation scenario — verify that as woodland recovers, HWC events increase (conservation paradox)
5. **Benefit-cost test**: Verify that governance actions (meetings, monitoring) have visible payoff within ~12 turns, otherwise AI neighbors disengage
6. **Visual test**: Open in Chrome DevTools mobile mode (320px width) — all UI elements reachable, text readable, icons meaningful
7. **PWA test**: Build, serve, install as PWA on Android — verify offline functionality
8. **Save/load test**: Play 10 turns, close browser, reopen — verify state preserved

---

## Research-Informed Design Decisions

Specific design choices grounded in the research documents:

| Design Choice | Research Basis |
|---|---|
| Social pressure as default first sanction | WWF Manual Ch.5: "compliance with local rules largely results from social pressure within the community, not formal penalties" |
| Locally-defined rules get higher compliance | Best Practices §3 Principle 11: "If bylaws are locally defined and agreed upon by the community, there is more chance of adherence" |
| Benefits must outweigh costs or participation collapses | Principle 7: "There is little incentive to manage sustainably if costs exceed benefits" |
| Wealth inequality among neighbors | Chobe Enclave case: "10% of households control 60% of total assets" |
| Headman/traditional authority NPC | Manual Ch.4: "Consult Traditional Authorities first — obtain support, keep informed"; ignoring them risks sabotage |
| Benefit distribution vote mechanic | CAMPFIRE/Zimbabwe: direct household dividends vs. community projects is an ongoing real debate |
| Event Book monitoring system | Namibia's actual system: community game guards record standardized data daily → monthly → annual summaries |
| HWC increases with conservation success | Manual Ch.5: "as wildlife numbers improve, HWC costs also rise" — the conservation paradox |
| Chilli fencing as mitigation action | Manual Ch.5: "elephants find capsicum highly unpalatable" — real technique from Zimbabwe |
| Veld products as drought safety net | Manual Ch.5: "importance increases during drought or unemployment" |
| 12-year chapter = institution-building timescale | Best Practices §4: "institution building at community level may take around 10 years for simple, local-level institutions" |
| Outsider encroachment events | Principle 3: exclusion of others is foundational to CPRM; without it, open access returns |
| Externally imposed rules have lower compliance | Principle 11 + Best Practice 1: locally appropriate rules outperform top-down mandates |

---

## Open Items

- **Specific local crops/livestock**: Prototype uses maize + cattle. Research mentions millet, cotton, tobacco, groundnuts, vegetables. Should confirm with local knowledge which to add post-prototype.
- **Game name**: "Miombo" confirmed as working title?
- **Art direction**: Colored rectangles for prototype — when should illustrated assets be developed?
- **Gender/equity mechanics**: Research highlights women as marginalized stakeholders. Consider post-prototype mechanic where meeting participation requirements ensure diverse representation.
- **Private sector partnerships**: Research documents tourism joint ventures and trophy hunting contracts as major revenue sources. Defer to post-prototype but architecture should support partnership events.
- **Fire management**: Research mentions strategic use of fire for vegetation management. Could add as seasonal action (controlled burn vs. wildfire risk).
