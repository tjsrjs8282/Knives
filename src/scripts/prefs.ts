/** Viewer preferences, persisted per browser. Storage can throw (private mode) — never fatal. */
export type PrefKey = "sound" | "music" | "motion";

const KEYS: Record<PrefKey, string> = { sound: "ko:sound", music: "ko:music", motion: "ko:motion" };
const listeners = new Map<PrefKey, Set<(v: boolean) => void>>();

function read(key: PrefKey): string | null {
  try {
    return localStorage.getItem(KEYS[key]);
  } catch {
    return null;
  }
}

export const prefs = {
  get(key: PrefKey): boolean {
    const raw = read(key);
    if (key === "motion") return raw === null ? !document.documentElement.classList.contains("reduce-motion") : raw === "full";
    return raw === "on";
  },
  set(key: PrefKey, value: boolean) {
    try {
      localStorage.setItem(KEYS[key], key === "motion" ? (value ? "full" : "reduced") : value ? "on" : "off");
    } catch {
      /* private mode: keep it for this page view only */
    }
    listeners.get(key)?.forEach((fn) => fn(value));
  },
  on(key: PrefKey, fn: (v: boolean) => void) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key)!.add(fn);
  },
};

export const reducedMotion = () => document.documentElement.classList.contains("reduce-motion");
export const coarsePointer = () => window.matchMedia("(hover: none), (pointer: coarse)").matches;
