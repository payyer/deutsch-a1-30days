import { useSyncExternalStore } from 'react';

const KEY = 'deutsch-a1-v1';

const DEFAULTS = {
  done: {}, // { [day]: 'YYYY-MM-DD' }
  steps: {}, // { [day]: { [stepId]: true } }
  scores: {}, // { [day]: best % }
  srs: {}, // { [wordId]: { due, ivl, ease, reps, lapses } }
  activity: {}, // { 'YYYY-MM-DD': true } – ngày có học
  settings: { voiceURI: null, rate: 0.9, preferNative: true, autoplay: true, reviewMode: 'vi' },
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const s = JSON.parse(raw);
    return { ...structuredClone(DEFAULTS), ...s, settings: { ...DEFAULTS.settings, ...s.settings } };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

let state = load();
const listeners = new Set();

export function getState() {
  return state;
}

export function update(fn) {
  const next = structuredClone(state);
  fn(next);
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  listeners.forEach((l) => l());
}

export function replaceState(s) {
  update((d) => {
    Object.keys(d).forEach((k) => delete d[k]);
    Object.assign(d, structuredClone(DEFAULTS), s);
  });
}

export function resetState() {
  replaceState(structuredClone(DEFAULTS));
}

function subscribe(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore(selector = (s) => s) {
  return selector(useSyncExternalStore(subscribe, getState));
}

export const todayStr = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};

/** Số ngày liên tiếp có học (tính đến hôm nay hoặc hôm qua). */
export function streak(activity) {
  let n = 0;
  const d = new Date();
  if (!activity[todayStr(d)]) d.setDate(d.getDate() - 1);
  while (activity[todayStr(d)]) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function markActive() {
  const t = todayStr();
  if (!state.activity[t]) update((s) => (s.activity[t] = true));
}
