import type { GameState } from '../simulation/GameState.js';

const SAVE_KEY = 'miombo-save';

export function saveGame(state: GameState): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadGame(): GameState | null {
  const data = localStorage.getItem(SAVE_KEY);
  if (!data) return null;
  return JSON.parse(data) as GameState;
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
