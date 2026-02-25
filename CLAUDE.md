# Miombo

Turn-based resource management game set in western Zambia. Teaches sustainable farming, communal resource stewardship, and collective action via Ostrom's commons governance principles.

## Tech Stack
- Phaser 3 + TypeScript + Vite
- PWA (offline-capable, installable on Android)
- State in localStorage

## Key Architecture Rule
**Everything in `src/simulation/` must be pure TypeScript with ZERO Phaser imports.** This enables unit testing and clean separation of simulation from rendering.

## Project Structure
- `DESIGN.md` — Full game design document and implementation plan
- `Research/` — CBNRM research documents
- `src/simulation/` — Pure TS game logic (models, systems, actions, utils)
- `src/scenes/` — Phaser scenes
- `src/ui/` — Reusable Phaser UI components
- `src/rendering/` — State-to-visual bridge
- `src/i18n/` — Localization
- `src/persistence/` — Save/load
- `tests/simulation/` — Unit tests for core systems

## Build Sequence
See DESIGN.md for full phased plan. Foundation files (package.json, tsconfig.json, vite.config.ts, index.html, manifest.json) have been partially scaffolded.

## Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm test` — Run simulation unit tests (vitest)
