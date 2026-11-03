// Datos de ejemplo para la demo. Se generan relativos a la fecha de hoy
// (dos meses atrás hasta hoy) para que la app siempre se vea "viva".
// El horario es el real de 247 Studio; nombres de alumnos y precios son inventados.
import { todayISO, nowHM, addDays, addMonths, monthOf, weekday } from './util.js';
import { DATA_VERSION } from './store.js';

function random(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Perfil: r = regular, i = viene unos meses sí y otros no, n = nuevo desde el mes pasado, b = baja
const PEOPLE = [
  ['Adrián Morales', ['g_bjj_gi'], 'p_bjj', 'r'],
  ['Sergio Navarro', ['g_bjj_gi'], 'p_bjj', 'r'],
  ['Iván Castillo', ['g_bjj_gi'], 'p_bjj', 'i'],
  ['Rubén Ortega', ['g_bjj_gi'], 'p_bjj', 'r'],
  ['Álvaro Delgado', ['g_bjj_gi', 'g_open'], 'p_bjj', 'r'],
  ['Pablo Romero', ['g_bjj_gi'], 'p_bjj', 'n', 'Viene de otro club, cinturón azul'],
  ['Hugo Serrano', ['g_bjj_gi'], 'p_bjj', 'i'],
  ['Diego Molina', ['g_bjj_gi'], 'p_bjj', 'r'],
  ['Marcos Gil', ['g_bjj_gi', 'g_grap', 'g_comp', 'g_open'], 'p_bjj_grap', 'r', 'Compite en diciembre'],
  ['Víctor Herrera', ['g_bjj_gi', 'g_grap', 'g_open'], 'p_bjj_grap', 'r'],
  ['Daniel Vega', ['g_bjj_gi', 'g_mma', 'g_lucha', 'g_grap', 'g_comp', 'g_open'], 'p_libre', 'r'],
  ['Lucía Fernández', ['g_bjj_fem'], 'p_bjj', 'r'],
  ['Marta Ruiz', ['g_bjj_fem'], 'p_bjj', 'r'],
  ['Paula Jiménez', ['g_bjj_fem'], 'p_bjj', 'i'],
  ['Andrea Moreno', ['g_bjj_fem'], 'p_bjj', 'r'],
  ['Sara Blanco', ['g_bjj_fem'], 'p_bjj', 'n'],
  ['Elena Prieto', ['g_bjj_fem', 'g_grap', 'g_open'], 'p_bjj_grap', 'r'],
  ['Leo Martín', ['g_kids1'], 'p_kids', 'r', 'Paga su madre (Ana)'],
  ['Mateo Sanz', ['g_kids1'], 'p_kids', 'r', 'Hermano de Martina'],
  ['Nico Rubio', ['g_kids1'], 'p_kids', 'r'],
  ['Bruno Cano', ['g_kids1'], 'p_kids', 'r'],
  ['Martina Sanz', ['g_kids2'], 'p_kids', 'r', 'Hermana de Mateo'],
  ['Alba Medina', ['g_kids2'], 'p_kids', 'i'],
  ['Iker Vidal', ['g_kids2'], 'p_kids', 'n'],
  ['Javier Ramos', ['g_mma'], 'p_mma', 'r'],
  ['Raúl Peña', ['g_mma'], 'p_mma', 'i'],
  ['Óscar Lozano', ['g_mma'], 'p_mma', 'r'],
  ['Manu Vargas', ['g_mma', 'g_lucha'], 'p_mma_lucha', 'r'],
  ['Kevin Soto', ['g_mma', 'g_lucha'], 'p_mma_lucha', 'i'],
  ['Alejandro Pastor', ['g_lucha'], 'p_lucha', 'r'],
  ['Carla Núñez', ['g_lucha'], 'p_lucha', 'r'],
  ['Samuel Crespo', ['g_lucha'], 'p_lucha', 'i'],
  ['Jorge Calvo', ['g_grap', 'g_open'], 'p_grap', 'r'],
  ['Nerea Campos', ['g_grap'], 'p_grap', 'r'],
  ['Gonzalo Ibáñez', ['g_grap'], 'p_grap', 'i'],
  ['Tomás Reyes', ['g_grap', 'g_bjj_gi'], 'p_bono8', 'r', 'Trabaja a turnos, prefiere bono'],
  ['Irene Santos', ['g_bjj_fem'], 'p_bono4', 'i'],
  ['Fran Domínguez', ['g_mma'], 'p_bono8', 'r'],
  ['Clara Mora', ['g_grap'], 'p_bono4', 'i'],
  ['Luis Cabrera', ['g_bjj_gi'], 'p_bjj', 'b'],
  ['Silvia Rey', ['g_lucha'], 'p_lucha', 'b'],
  ['Emilio Fuentes', ['g_mma'], 'p_mma', 'b'],
];

// Horario de 247 Studio. day: 0 = domingo … 6 = sábado
const S = (day, start, end) => ({ day, start, end });
const GROUPS = [
  { id: 'g_kids1', disciplineId: 'd_bjj', name: 'Kids 1 (+7 años)', sessions: [S(1, '17:30', '18:30'), S(3, '17:30', '18:30'), S(5, '17:30', '18:30')] },
  { id: 'g_kids2', disciplineId: 'd_bjj', name: 'Kids 2 (3 a 6 años)', sessions: [S(2, '17:30', '18:30'), S(4, '17:30', '18:30')] },
  { id: 'g_bjj_gi', disciplineId: 'd_bjj', name: 'Gi', sessions: [S(1, '10:00', '11:30'), S(1, '19:30', '20:30'), S(3, '19:30', '20:30'), S(3, '20:30', '21:30')] },
  { id: 'g_bjj_fem', disciplineId: 'd_bjj', name: 'Femenino', sessions: [S(2, '18:30', '19:30'), S(4, '18:30', '19:30')] },
  { id: 'g_mma', disciplineId: 'd_mma', name: '', sessions: [S(1, '18:30', '19:30'), S(3, '18:30', '19:30'), S(5, '18:30', '19:30')] },
  { id: 'g_grap', disciplineId: 'd_grap', name: '', sessions: [S(1, '20:30', '21:30'), S(2, '19:30', '20:30'), S(3, '10:00', '11:30'), S(4, '19:30', '20:30'), S(5, '10:00', '11:30')] },
  { id: 'g_lucha', disciplineId: 'd_lucha', name: '', sessions: [S(2, '20:30', '21:30'), S(4, '20:30', '21:30')] },
  { id: 'g_comp', disciplineId: 'd_comp', name: '', sessions: [S(5, '19:30', '20:30')] },
  { id: 'g_open', disciplineId: 'd_open', name: '', sessions: [S(5, '20:30', '21:30')] },
];

export function createSeed() {
  const today = todayISO();
  const now = nowHM();
  const rnd = random(20261102);
  let counter = 0;
  const id = (p) => `${p}_${++counter}`;

  const owners = [
    { id: 'o1', name: 'Socio 1' },
    { id: 'o2', name: 'Socio 2' },
    { id: 'o3', name: 'Socio 3' },
  ];
  const ownerId = () => owners[Math.floor(rnd() * owners.length)].id;

  const disciplines = [
    { id: 'd_bjj', name: 'BJJ', color: '#b91c1c', archived: false },
    { id: 'd_lucha', name: 'Lucha', color: '#1d4ed8', archived: false },
    { id: 'd_mma', name: 'MMA', color: '#15803d', archived: false },
    { id: 'd_grap', name: 'Grappling', color: '#a16207', archived: false },
    { id: 'd_comp', name: 'Comp Class', color: '#7c3aed', archived: false, free: true },
    { id: 'd_open', name: 'Open Mat', color: '#4b5563', archived: false, free: true },
  ];
  const groups = GROUPS.map((g) => ({ archived: false, ...g, sessions: g.sessions.map((s) => ({ ...s })) }));
  // Comp Class y Open Mat son libres: ninguna tarifa las incluye.
  const ALL = disciplines.filter((d) => !d.free).map((d) => d.id);
  const monthly = (pid, name, price, disc) => ({ id: pid, name, type: 'mensual', price, disciplineIds: disc, sessions: null, validityDays: null, active: true });
  const plans = [
    monthly('p_bjj', 'BJJ mensual', 45, ['d_bjj']),
    monthly('p_kids', 'Kids mensual', 30, ['d_bjj']),
    monthly('p_lucha', 'Lucha mensual', 35, ['d_lucha']),
    monthly('p_mma', 'MMA mensual', 45, ['d_mma']),
    monthly('p_grap', 'Grappling mensual', 35, ['d_grap']),
    monthly('p_bjj_grap', 'BJJ + Grappling', 60, ['d_bjj', 'd_grap']),
    monthly('p_mma_lucha', 'MMA + Lucha', 60, ['d_mma', 'd_lucha']),
    monthly('p_libre', 'Tarifa libre (todas)', 75, ALL),
    { id: 'p_bono8', name: 'Bono 8 días', type: 'bono', price: 40, disciplineIds: ALL, sessions: 8, validityDays: 30, active: true },
    { id: 'p_bono4', name: 'Bono 4 días', type: 'bono', price: 25, disciplineIds: ALL, sessions: 4, validityDays: 30, active: true },
  ];
  const planById = Object.fromEntries(plans.map((p) => [p.id, p]));
  const groupById = Object.fromEntries(groups.map((g) => [g.id, g]));

  const m0 = monthOf(today);
  const months = [addMonths(m0, -2), addMonths(m0, -1), m0];
  const start = `${months[0]}-01`;
  const dates = [];
  for (let d = start; d <= today; d = addDays(d, 1)) dates.push(d);

  const students = [];
  const attendance = [];
  const payments = [];

  const pay = (studentId, plan, extra, date) => payments.push({
    id: id('pay'),
    studentId,
    planId: plan.id,
    planName: plan.name,
    type: plan.type,
    month: extra.month || null,
    startDate: extra.startDate || null,
    sessions: plan.sessions,
    validityDays: plan.validityDays,
    disciplineIds: [...plan.disciplineIds],
    amount: plan.price,
    date,
    by: ownerId(),
    voided: false,
    voidReason: '',
    createdAt: counter,
  });

  PEOPLE.forEach(([name, groupIds, planId, kind, notes = '']) => {
    const sid = id('stu');
    const rate = 0.45 + rnd() * 0.45;
    const active = {};
    months.forEach((m, i) => {
      active[m] = kind === 'b' ? i === 0 : kind === 'n' ? i >= 1 : kind === 'i' ? rnd() < 0.5 : true;
    });
    if (kind === 'i' && !months.some((m) => active[m])) active[months[1]] = true;
    const joined = kind === 'n' ? `${months[1]}-0${1 + Math.floor(rnd() * 8)}` : addDays(start, -30 - Math.floor(rnd() * 400));
    students.push({ id: sid, name, phone: '', groupIds, planId, status: kind === 'b' ? 'baja' : 'activo', notes, createdAt: joined });

    const mine = [];
    for (const d of dates) {
      if (!active[monthOf(d)] || d < joined) continue;
      const wd = weekday(d);
      for (const gid of groupIds) {
        // Hoy solo cuentan las clases que ya han empezado.
        const hasClass = groupById[gid].sessions.some((s) => s.day === wd && (d < today || s.start <= now));
        if (hasClass && rnd() < rate) {
          const a = { id: id('att'), studentId: sid, groupId: gid, date: d, by: ownerId() };
          attendance.push(a);
          mine.push(a);
        }
      }
    }

    const plan = planById[planId];
    if (plan.type === 'mensual') {
      months.forEach((m, i) => {
        const first = mine.find((a) => a.date.startsWith(m));
        if (!first) return;
        const chance = i === 0 ? 0.95 : i === 1 ? 0.85 : 0.55;
        if (rnd() < chance) pay(sid, plan, { month: m }, first.date);
      });
    } else {
      // Simula el bono: compra uno nuevo cuando no tiene o se le ha acabado.
      let current = null;
      for (const d of [...new Set(mine.map((a) => a.date))]) {
        if (!current || d > current.end || current.used >= plan.sessions) {
          if (rnd() < (monthOf(d) === m0 ? 0.7 : 0.9)) {
            current = { end: addDays(d, plan.validityDays - 1), used: 0 };
            pay(sid, plan, { startDate: d }, d);
          } else {
            current = null;
            continue;
          }
        }
        current.used++;
      }
    }
  });

  // Un ejemplo de cobro anulado por duplicado, para enseñar cómo queda el registro.
  const dup = payments.find((p) => p.month === months[1]);
  if (dup) payments.push({ ...dup, id: id('pay'), by: 'o2', voided: true, voidReason: 'Duplicado: ya estaba cobrado', voidedBy: 'o2', voidedAt: dup.date, createdAt: counter });

  return {
    version: DATA_VERSION,
    gymName: '247 Studio',
    currentOwnerId: 'o1',
    owners,
    disciplines,
    groups,
    plans,
    students,
    attendance,
    payments,
    seededAt: today,
  };
}
