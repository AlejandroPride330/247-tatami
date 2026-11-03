// Utilidades sin dependencias: fechas, formato y texto.

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function eur(n) {
  const v = Number(n) || 0;
  return v.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: Number.isInteger(v) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

// Fechas como texto 'AAAA-MM-DD' en hora local (evita desfases de zona horaria).
const pad = (n) => String(n).padStart(2, '0');
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const todayISO = () => toISO(new Date());
export const nowHM = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const monthOf = (iso) => iso.slice(0, 7);
export const addDays = (iso, n) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const addMonths = (mk, n) => {
  const [y, m] = mk.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
export const weekday = (iso) => parseISO(iso).getDay();

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const WD = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
// Orden de lunes a domingo, con el índice de getDay().
export const WEEK = [[1, 'L'], [2, 'M'], [3, 'X'], [4, 'J'], [5, 'V'], [6, 'S'], [0, 'D']];

export const monthName = (mk) => MONTHS[Number(mk.slice(5, 7)) - 1];
export const monthShort = (mk) => monthName(mk).slice(0, 3);
export const monthLabel = (mk) => `${monthName(mk)} ${mk.slice(0, 4)}`;
export const dayLabel = (iso) => {
  const d = parseISO(iso);
  return `${WD[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
};
export const shortDate = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
// sessions: [{ day: 0-6, start: 'HH:MM', end: 'HH:MM' }]  ->  'L 10:00/19:30 · X 19:30'
export const scheduleText = (sessions = []) =>
  WEEK.map(([n, l]) => {
    const starts = sessions.filter((s) => s.day === n).map((s) => s.start).sort();
    return starts.length ? `${l} ${starts.join('/')}` : null;
  }).filter(Boolean).join(' · ') || 'Sin horario';

export const normalize = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const byName = (a, b) => a.name.localeCompare(b.name, 'es');
export const uid = (p = 'id') => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function push(map, key, value) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}
