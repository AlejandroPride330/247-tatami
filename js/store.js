// Estado de la app. En la demo vive en el propio móvil (localStorage);
// en la versión real este módulo se conectará a la base de datos compartida.
import { createSeed } from './seed.js';

const KEY = 'tatami-demo-v3';
export const DATA_VERSION = 3;
let state = null;
let revision = 0;
const listeners = new Set();

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw);
  } catch {
    state = null;
  }
  if (!isValid(state)) {
    state = createSeed();
    persist();
  }
  return state;
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Sin almacenamiento (modo privado): la app sigue funcionando en memoria.
  }
}

function notify() {
  revision++;
  listeners.forEach((l) => l());
}

export const getState = () => state;
export const rev = () => revision;

export function update(fn) {
  fn(state);
  persist();
  notify();
}

export function replace(next) {
  state = next;
  persist();
  notify();
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isValid(s) {
  return !!s && s.version === DATA_VERSION &&
    ['owners', 'disciplines', 'groups', 'plans', 'students', 'attendance', 'payments'].every((k) => Array.isArray(s[k]));
}

export const find = (list, id) => state[list].find((x) => x.id === id);
export const currentOwner = () => find('owners', state.currentOwnerId) || state.owners[0];
