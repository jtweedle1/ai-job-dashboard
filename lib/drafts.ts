// Pure-ish: unsaved text kept in this browser's localStorage so an interruption doesn't cost it.
// Keys carry the user's id, and every draft is cleared on sign-out (shared computers).

const PREFIX = "wayfinder:draft:";

export function draftKey(uid: string, name: string): string {
  return `${PREFIX}${uid}:${name}`;
}

// localStorage can be missing or throw (private windows, blocked storage); drafts are a nicety, so fail quietly.
export function readDraft<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw == null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

export function writeDraft(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the draft just isn't kept.
  }
}

export function clearDraft(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {}
}

export function clearAllDrafts(): void {
  try {
    const keys = Object.keys(window.localStorage).filter((k) => k.startsWith(PREFIX));
    for (const k of keys) window.localStorage.removeItem(k);
  } catch {}
}
