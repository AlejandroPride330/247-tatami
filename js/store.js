// Estado de la app. En la demo vive en la propia tablet (localStorage);
// en la versión real este módulo se conectará a la base de datos.
import { createSeed } from './seed.js';

const KEY = 'tatami-demo-v3';
export const DATA_VERSION = 4;
let state = null;
let revision = 0;
const listeners = new Set();

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = migrate(JSON.parse(raw));
  } catch {
    state = null;
  }
  if (!isValid(state)) {
    state = createSeed();
    persist();
  }
  return state;
}

// Avisa si la tablet se queda sin espacio (las fotos y firmas ocupan).
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    window.dispatchEvent(new CustomEvent('tatami:storage-full'));
    return false;
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
  state = migrate(next);
  persist();
  notify();
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isValid(s) {
  return !!s && s.version === DATA_VERSION &&
    ['disciplines', 'groups', 'plans', 'students', 'attendance', 'payments'].every((k) => Array.isArray(s[k]));
}

// Iconos por defecto de las disciplinas (se cambian en Ajustes).
export function defaultIcon(name = '') {
  const n = name.toLowerCase();
  if (n.includes('lucha') || n.includes('wrest')) return '🤼';
  if (n.includes('mma') || n.includes('box') || n.includes('kick')) return '🥊';
  if (n.includes('grap')) return '💪';
  if (n.includes('comp')) return '🏆';
  if (n.includes('open')) return '🤸';
  return '🥋';
}

// v3 → v4: ya no hay socios (la app vive en una sola tablet), cada disciplina tiene icono
// y el nombre del alumno se separa en nombre y apellidos.
export function migrate(s) {
  if (!s || s.version !== 3) return s;
  delete s.owners;
  delete s.currentOwnerId;
  s.attendance?.forEach((a) => { delete a.by; });
  s.payments?.forEach((p) => { delete p.by; delete p.voidedBy; });
  s.disciplines?.forEach((d) => { d.icon = d.icon || defaultIcon(d.name); });
  s.students?.forEach((st) => {
    if (st.firstName !== undefined) return;
    const [first = '', ...rest] = String(st.name || '').trim().split(/\s+/);
    st.firstName = first;
    st.lastName1 = rest[0] || '';
    st.lastName2 = rest.slice(1).join(' ');
    st.photo = st.photo || null;
    st.consent = st.consent || null;
  });
  s.privacy = s.privacy || { holder: '', contact: '' };
  s.version = 4;
  return s;
}

export const find = (list, id) => state[list].find((x) => x.id === id);
