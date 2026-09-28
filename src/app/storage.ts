// The save's home on the device: localStorage under the one key (src/sim/save.ts has the format). Moving saves to
// IndexedDB once one passes 1 MB changes only this file. Storage can be full, blocked or missing (a private window), so
// every call is guarded and the game plays on without it.
import {SAVE_KEY} from '../sim/save';

export function readSave(): string | null {
  try {
    return localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
}

/** Writes a save; false if the device wouldn't keep it. */
export function writeSave(text: string): boolean {
  try {
    localStorage.setItem(SAVE_KEY, text);
    return true;
  } catch {
    return false;
  }
}
