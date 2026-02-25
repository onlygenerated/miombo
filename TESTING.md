# Miombo — Manual Test Checklist

## Automated Tests
- [ ] `npm test` — all 186 tests pass
- [ ] `npm run build` — production build succeeds (43 modules, 0 TS errors)

## Core Flow
- [ ] Menu → "New Game" → GameScene loads with tile grid and HUD
- [ ] "Plan Turn" opens DecisionScene → select 2 actions → Confirm
- [ ] Turn processes: tile colors update, HUD refreshes
- [ ] After 3 turns: Meeting overlay appears (quarterly)
- [ ] Meeting: propose rule → vote result displayed → Continue closes overlay
- [ ] After meeting: GameScene resumes (not stuck in paused state)

## Narrative Events
- [ ] During drought season: drought event card appears with warning border
- [ ] With high wildlife + growing crops + no chilli fence: elephant raid event
- [ ] With high wildlife + cattle + no night kraal: lion attack event
- [ ] Events show paginated (one at a time) with icon, title, body, severity
- [ ] "Next" button advances, "Continue" on last event closes overlay

## Chapter Transition
- [ ] At turn 144 (year 12): Summary shows year-end metrics
- [ ] Continue → chapter narrative phase: generation story, pressure warning
- [ ] "Begin New Chapter" → game continues with reduced cattle/money/trust
- [ ] Neighbor cattle increased ~15%, trust/cohesion reduced ~15%

## Save/Load
- [ ] Play 3+ turns → Menu → "Continue" → state restored
- [ ] Verify meeting rules persist across save/load
- [ ] Verify narrative event cooldowns persist

## PWA (Production Build)
- [ ] `npm run build` → serve dist/ → browser → install prompt appears
- [ ] Install → app opens standalone
- [ ] Go offline → app still loads from cache
- [ ] manifest.json served at /manifest.json
- [ ] Icons at /icons/icon-192.png and /icons/icon-512.png

## Balance Checks
- [ ] 12 turns rest-only: grazing health drops slightly from neighbor activity
- [ ] 12 turns patrol + meetings: monitoring > 40, reputation > 60
- [ ] High wildlife presence: crop raids occur (check events)
- [ ] Cattle left unprotected: predation events appear
