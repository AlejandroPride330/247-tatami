// Reglas de negocio: qué cubre cada pago y en qué estado está cada alumno cada mes.
//
// - Una cuota mensual cubre el mes natural completo para las disciplinas de su tarifa.
// - Un bono da N días (fechas distintas) dentro de su validez, para sus disciplinas.
// - Una asistencia que no cubre ni cuota ni bono deja al alumno "Por cobrar" ese mes.
// - Las disciplinas libres (Open Mat, Comp Class…) no se cobran: se pasa lista, pero no cuentan
//   para la cuota ni gastan días de bono.
// - Cada mes empieza de cero: si no vino, no debe nada.
import { getState, rev, find } from './store.js';
import { addDays, todayISO, weekday, push } from './util.js';

export const STATUS = {
  cobrar: 'Por cobrar',
  pagado: 'Pagado',
  bono: 'Bono',
  sin: 'Sin actividad',
};

let cache = { rev: -1, map: new Map() };

function ensure() {
  if (cache.rev === rev()) return;
  const s = getState();
  const free = new Set(s.disciplines.filter((d) => d.free).map((d) => d.id));
  const groupInfo = new Map(s.groups.map((g) => [g.id, { disc: g.disciplineId, free: free.has(g.disciplineId) }]));
  const attBy = new Map();
  const payBy = new Map();
  s.attendance.forEach((a) => push(attBy, a.studentId, a));
  s.payments.forEach((p) => { if (!p.voided) push(payBy, p.studentId, p); });
  const map = new Map();
  for (const st of s.students) map.set(st.id, analyze(attBy.get(st.id) || [], payBy.get(st.id) || [], groupInfo));
  cache = { rev: rev(), map };
}

function analyze(atts, pays, groupInfo) {
  const monthCov = new Map(); // 'AAAA-MM' -> Set(disciplineId)
  const monthPays = new Map(); // 'AAAA-MM' -> [pagos]
  const bonos = [];
  for (const p of pays) {
    if (p.type === 'mensual') {
      if (!monthCov.has(p.month)) monthCov.set(p.month, new Set());
      p.disciplineIds.forEach((d) => monthCov.get(p.month).add(d));
      push(monthPays, p.month, p);
    } else {
      bonos.push({
        payment: p,
        start: p.startDate,
        end: addDays(p.startDate, (p.validityDays || 30) - 1),
        sessions: p.sessions || 0,
        used: 0,
        use: new Map(), // disciplina -> clases cubiertas (para repartir el importe)
        disc: new Set(p.disciplineIds),
      });
    }
  }
  bonos.sort((a, b) => a.start.localeCompare(b.start));

  const list = atts
    .map((a) => {
      const info = groupInfo.get(a.groupId) || {};
      return { ...a, ...info, cover: info.free ? 'libre' : null };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  const includes = (discSet, a) => discSet.has(a.disc);

  // Recorremos por días: un día de bono se gasta una vez aunque haga dos clases.
  for (let i = 0; i < list.length;) {
    const date = list[i].date;
    let j = i;
    while (j < list.length && list[j].date === date) j++;
    const cov = monthCov.get(date.slice(0, 7));
    const pending = [];
    for (const a of list.slice(i, j)) {
      if (a.cover) continue;
      if (cov && includes(cov, a)) a.cover = 'mensual';
      else pending.push(a);
    }
    if (pending.length) {
      const b = bonos.find((x) => x.start <= date && date <= x.end && x.used < x.sessions && pending.some((a) => includes(x.disc, a)));
      if (b) {
        b.used++;
        pending.forEach((a) => {
          if (!includes(b.disc, a)) return;
          a.cover = 'bono';
          b.use.set(a.disc, (b.use.get(a.disc) || 0) + 1);
        });
      }
    }
    i = j;
  }
  bonos.forEach((b) => { b.remaining = b.sessions - b.used; });
  return { atts: list, monthCov, monthPays, bonos };
}

export function analysisFor(studentId) {
  ensure();
  return cache.map.get(studentId) || { atts: [], monthCov: new Map(), monthPays: new Map(), bonos: [] };
}

export function activeBono(studentId, day = todayISO()) {
  return analysisFor(studentId).bonos.find((b) => b.start <= day && day <= b.end && b.remaining > 0) || null;
}

export function monthStatus(studentId, month) {
  const an = analysisFor(studentId);
  const atts = an.atts.filter((a) => a.date.startsWith(month) && a.cover !== 'libre');
  const uncovered = atts.filter((a) => !a.cover);
  const paid = an.monthPays.get(month) || [];
  const days = new Set(atts.map((a) => a.date)).size;
  const bono = month === todayISO().slice(0, 7) ? activeBono(studentId) : null;
  const bonoInMonth = an.bonos.some((b) => b.start.slice(0, 7) <= month && b.end.slice(0, 7) >= month);

  let code;
  let label;
  if (uncovered.length) {
    code = 'cobrar';
    label = paid.length ? 'Clase no incluida' : bonoInMonth ? 'Bono agotado' : STATUS.cobrar;
  } else if (paid.length) {
    code = 'pagado';
    label = STATUS.pagado;
  } else if (atts.length || bono) {
    code = 'bono';
    label = bono ? `Bono · quedan ${bono.remaining}` : STATUS.bono;
  } else {
    code = 'sin';
    label = STATUS.sin;
  }
  return { code, label, days, uncovered, paid, bono };
}

// --- Catálogo (disciplinas, clases y tarifas) ---

export const activeDisciplines = () => getState().disciplines.filter((d) => !d.archived);
// Las que se cobran (sin Open Mat, Comp Class ni otras libres).
export const billableDisciplines = () => activeDisciplines().filter((d) => !d.free);
export const isFree = (disciplineId) => !!find('disciplines', disciplineId)?.free;

export function activeGroups() {
  const order = activeDisciplines().map((d) => d.id);
  return getState().groups
    .filter((g) => !g.archived && order.includes(g.disciplineId))
    .sort((a, b) => order.indexOf(a.disciplineId) - order.indexOf(b.disciplineId));
}

export const activePlans = () => getState().plans.filter((p) => p.active);

// Horario de un día: [{ group, start, end }] por hora. Junta sesiones seguidas de la misma clase
// (p. ej. BJJ Gi 19:30–20:30 y 20:30–21:30 se muestran como 19:30–21:30).
export function daySchedule(date) {
  const wd = weekday(date);
  const out = [];
  for (const g of activeGroups()) {
    const sessions = (g.sessions || []).filter((s) => s.day === wd).sort((a, b) => a.start.localeCompare(b.start));
    for (const s of sessions) {
      const prev = out.find((o) => o.group === g && o.end === s.start);
      if (prev) prev.end = s.end;
      else out.push({ group: g, start: s.start, end: s.end });
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

// La clase en curso; si no hay, la siguiente; si ya acabaron todas, la última.
export function currentSlot(schedule, now) {
  return schedule.find((s) => s.start <= now && now < s.end)
    || schedule.find((s) => s.start > now)
    || schedule[schedule.length - 1]
    || null;
}

export function groupLabel(g) {
  const d = find('disciplines', g.disciplineId);
  if (!d) return g.name;
  return g.name ? `${d.name} · ${g.name}` : d.name;
}

export function studentGroupsText(st) {
  return st.groupIds.map((id) => find('groups', id)).filter(Boolean).map(groupLabel).join(', ') || 'Sin clase asignada';
}

export const disciplineColor = (id) => find('disciplines', id)?.color || '#78716c';

export function expectedAmount(st) {
  return find('plans', st.planId)?.price || 0;
}

// --- Reparto por disciplinas (para saber cuánta gente y cuánto dinero mueve cada una) ---

// Precio de referencia de una disciplina: su cuota mensual suelta más cara (BJJ 45 €, no Kids 30 €).
function basePrice(disciplineId) {
  const prices = getState().plans
    .filter((p) => p.type === 'mensual' && p.disciplineIds.length === 1 && p.disciplineIds[0] === disciplineId)
    .map((p) => p.price);
  return prices.length ? Math.max(...prices) : 0;
}

// Una tarifa combinada se reparte según el precio de cada disciplina suelta:
// BJJ + Grappling 60 € → BJJ 33,75 € (45) y Grappling 26,25 € (35). Si no hay precios, a partes iguales.
export function splitAmount(amount, disciplineIds, weights = null) {
  const ids = disciplineIds.filter((d) => find('disciplines', d) && !isFree(d));
  const w = ids.map((d) => (weights ? weights.get(d) || 0 : basePrice(d)));
  const total = w.reduce((a, b) => a + b, 0);
  return new Map(ids.map((d, i) => [d, total ? (amount * w[i]) / total : amount / ids.length]));
}

// Resumen de un mes por disciplina. El dinero es el de las cuotas de ese mes (aunque se cobraran
// antes o después) y el de los bonos que empiezan ese mes, repartidos según las clases que gastan.
export function disciplineReport(month) {
  const s = getState();
  const groupDisc = new Map(s.groups.map((g) => [g.id, g.disciplineId]));
  const rep = new Map(billableDisciplines().map((d) => [d.id, { disc: d, rows: [], cobrado: 0, pendiente: 0 }]));

  for (const st of s.students) {
    // Cada fila guarda también lo que ha pagado y lo que debe ese alumno en esa disciplina,
    // para poder sumar el dinero por clase (Gi, Kids…).
    const mine = new Map();
    const add = (map) => map.forEach((v, d) => {
      if (!rep.has(d)) return;
      rep.get(d).cobrado += v;
      if (mine.has(d)) mine.get(d).paid += v;
    });
    const an = analysisFor(st.id);
    const cov = an.monthCov.get(month) || new Set();
    const atts = an.atts.filter((a) => a.date.startsWith(month) && a.cover !== 'libre');
    const plan = find('plans', st.planId);
    for (const r of rep.values()) {
      const d = r.disc.id;
      const here = atts.filter((a) => a.disc === d);
      let code = null;
      if (here.some((a) => !a.cover)) code = 'cobrar';
      else if (cov.has(d)) code = 'pagado';
      else if (here.length) code = 'bono';
      else if (st.status === 'activo' && st.groupIds.some((g) => groupDisc.get(g) === d)) code = 'sin';
      if (!code) continue;
      const owe = code !== 'cobrar' ? 0
        : plan?.disciplineIds.includes(d) ? splitAmount(plan.price, plan.disciplineIds).get(d) || 0 : basePrice(d);
      const row = { st, code, days: new Set(here.map((a) => a.date)).size, groupIds: [...new Set(here.map((a) => a.groupId))], owe, paid: 0 };
      r.rows.push(row);
      mine.set(d, row);
      r.pendiente += owe;
    }
    (an.monthPays.get(month) || []).forEach((p) => add(splitAmount(p.amount, p.disciplineIds)));
    an.bonos
      .filter((b) => b.start.startsWith(month))
      .forEach((b) => add(splitAmount(b.payment.amount, b.payment.disciplineIds, b.used ? b.use : null)));
  }
  return [...rep.values()];
}

export function planSummary(p) {
  if (p.type === 'bono') return `${p.sessions} días · validez ${p.validityDays} días`;
  return p.disciplineIds.map((id) => find('disciplines', id)?.name).filter(Boolean).join(' + ') || 'Sin disciplinas';
}
