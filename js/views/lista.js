// Pestaña "Lista": el profesor marca quién ha venido a la clase.
// Se abre en la clase que toca según el horario (la que está en curso o la siguiente).
// Marcar asistencia activa al alumno ese mes y, si tiene bono, le descuenta el día.
import { getState, update, find } from '../store.js';
import { monthStatus, activeGroups, daySchedule, currentSlot, groupLabel, studentGroupsText, disciplineColor, isFree } from '../logic.js';
import { esc, todayISO, nowHM, addDays, dayLabel, monthOf, normalize, byName, uid } from '../util.js';
import { openSheet, toast, badge, dot, empty, avatar, requestRender } from '../ui.js';
import { openCobrar } from './cobrar.js';
import { openEditStudent } from './alumnos.js';

// slot: 'grupo@HH:MM' para una clase del horario del día, o 'grupo' para una clase de otro día.
const ui = { date: todayISO(), slot: null, groupId: null };

const slotKey = (s) => `${s.group.id}@${s.start}`;

function resolveDay() {
  const schedule = daySchedule(ui.date);
  const inSchedule = new Set(schedule.map((s) => s.group.id));
  const rest = activeGroups().filter((g) => !inSchedule.has(g.id));
  const valid = schedule.some((s) => slotKey(s) === ui.slot) || rest.some((g) => g.id === ui.slot);
  if (!valid) {
    const pick = ui.date === todayISO() ? currentSlot(schedule, nowHM()) : schedule[0];
    ui.slot = pick ? slotKey(pick) : rest[0]?.id || null;
  }
  ui.groupId = ui.slot ? ui.slot.split('@')[0] : null;
  return { schedule, rest };
}

const isPresent = (a, studentId) => a.studentId === studentId && a.groupId === ui.groupId && a.date === ui.date;

function roster() {
  const s = getState();
  const ids = new Set(s.students.filter((st) => st.status === 'activo' && st.groupIds.includes(ui.groupId)).map((st) => st.id));
  s.attendance.forEach((a) => { if (a.groupId === ui.groupId && a.date === ui.date) ids.add(a.studentId); });
  return s.students.filter((st) => ids.has(st.id)).sort(byName);
}

function toggle(studentId) {
  update((s) => {
    if (s.attendance.some((a) => isPresent(a, studentId))) {
      s.attendance = s.attendance.filter((a) => !isPresent(a, studentId));
    } else {
      s.attendance.push({ id: uid('att'), studentId, groupId: ui.groupId, date: ui.date });
      const st = s.students.find((x) => x.id === studentId);
      if (st.status === 'baja') st.status = 'activo';
    }
  });
}

export function render() {
  const { schedule, rest } = resolveDay();
  const isToday = ui.date === todayISO();
  const now = nowHM();
  const head = `
    <div class="toolbar">
      <button type="button" class="icon-btn" data-act="prev-day" aria-label="Día anterior">‹</button>
      <label class="date-pill">
        <span>${isToday ? 'Hoy, ' : ''}${esc(dayLabel(ui.date))}</span>
        <input type="date" data-act="date" value="${ui.date}" max="${todayISO()}" aria-label="Elegir fecha">
      </label>
      <button type="button" class="icon-btn" data-act="next-day" aria-label="Día siguiente" ${isToday ? 'disabled' : ''}>›</button>
    </div>`;
  if (!ui.groupId) return head + empty('No hay clases creadas', 'Crea disciplinas y clases en Ajustes.');

  const slotChip = (s) => {
    const key = slotKey(s);
    const live = isToday && s.start <= now && now < s.end;
    const done = isToday && s.end <= now;
    return `
    <button type="button" class="slot ${key === ui.slot ? 'on' : ''} ${done ? 'done' : ''}" data-slot="${key}">
      <span class="slot-time">${s.start}–${s.end}${live ? ' <span class="live">ahora</span>' : ''}</span>
      <span class="slot-name">${dot(disciplineColor(s.group.disciplineId))}${esc(groupLabel(s.group))}</span>
    </button>`;
  };
  const chip = (g) => `
    <button type="button" class="chip ${g.id === ui.slot ? 'on' : ''}" data-slot="${g.id}">
      ${dot(disciplineColor(g.disciplineId))}${esc(groupLabel(g))}
    </button>`;
  const people = roster();
  const presentIds = new Set(getState().attendance.filter((a) => a.groupId === ui.groupId && a.date === ui.date).map((a) => a.studentId));
  const month = monthOf(ui.date);

  return `${head}
    ${schedule.length
      ? `<div class="slots scroll">${schedule.map(slotChip).join('')}</div>`
      : `<p class="hint">${isToday ? 'Hoy' : 'Ese día'} no hay clases en el horario.</p>`}
    ${rest.length ? `<details class="others" ${schedule.length ? '' : 'open'}>
      <summary>Otra clase (fuera de horario)</summary>
      <div class="chips wrap">${rest.map(chip).join('')}</div>
    </details>` : ''}
    ${isFree(find('groups', ui.groupId)?.disciplineId) ? '<p class="note">Clase libre: se pasa lista, pero no se cobra ni gasta días de bono.</p>' : ''}
    <p class="hint"><strong>${presentIds.size}</strong> de ${people.length} presentes · toca un nombre para marcarlo</p>
    <div class="list">
      ${people.map((st) => {
        const on = presentIds.has(st.id);
        const ms = monthStatus(st.id, month);
        return `
        <div class="row att ${on ? 'on' : ''}" role="button" tabindex="0" aria-pressed="${on}" data-sid="${st.id}">
          <span class="check" aria-hidden="true">${on ? '✓' : ''}</span>
          ${avatar(st)}
          <span class="grow"><span class="name">${esc(st.name)}</span>${st.groupIds.includes(ui.groupId) ? '' : '<span class="sub">Invitado de otra clase</span>'}</span>
          ${badge(ms)}
          ${ms.code === 'cobrar' ? `<button type="button" class="mini-btn bad" data-cobrar="${st.id}" aria-label="Cobrar a ${esc(st.name)}">€</button>` : ''}
        </div>`;
      }).join('') || empty('Nadie apuntado a esta clase', 'Añade alumnos con el botón de abajo.')}
    </div>
    <button type="button" class="btn btn-block" data-act="add">+ Añadir alumno a esta clase</button>`;
}

export function bind(root) {
  root.oninput = null;
  root.onchange = (e) => {
    if (e.target.dataset.act === 'date' && e.target.value) {
      ui.date = e.target.value > todayISO() ? todayISO() : e.target.value;
      ui.slot = null;
      requestRender();
    }
  };
  root.onclick = (e) => {
    const cobrar = e.target.closest('[data-cobrar]')?.dataset.cobrar;
    if (cobrar) { openCobrar({ studentId: cobrar, month: monthOf(ui.date) }); return; }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'prev-day') { ui.date = addDays(ui.date, -1); ui.slot = null; requestRender(); return; }
    if (act === 'next-day') { ui.date = addDays(ui.date, 1); ui.slot = null; requestRender(); return; }
    if (act === 'add') { openAdd(); return; }
    const slot = e.target.closest('[data-slot]')?.dataset.slot;
    if (slot) { ui.slot = slot; requestRender(); return; }
    const sid = e.target.closest('[data-sid]')?.dataset.sid;
    if (sid) toggle(sid);
  };
}

function openAdd() {
  let q = '';
  const results = () => {
    const n = normalize(q);
    const present = new Set(getState().attendance.filter((a) => a.groupId === ui.groupId && a.date === ui.date).map((a) => a.studentId));
    const list = getState().students
      .filter((s) => !present.has(s.id) && (!n || normalize(s.name).includes(n)))
      .sort(byName)
      .slice(0, 60);
    return list.map((s) => `
      <div class="row" role="button" tabindex="0" data-pick="${s.id}">
        ${avatar(s)}
        <span class="grow"><span class="name">${esc(s.name)}</span><span class="sub">${esc(studentGroupsText(s))}</span></span>
        ${s.status === 'baja' ? '<span class="tag">Baja</span>' : ''}
      </div>`).join('') || '<p class="hint">Nadie con ese nombre. Puedes crearlo abajo.</p>';
  };
  const sheet = openSheet({
    title: 'Añadir a la clase',
    render: () => `
      <input type="search" class="search" data-q placeholder="Buscar alumno…" autocomplete="off">
      <div class="list" data-results>${results()}</div>
      <button type="button" class="btn btn-block" data-act="new">+ Crear alumno nuevo</button>`,
    bind(body) {
      const input = body.querySelector('[data-q]');
      setTimeout(() => input.focus(), 50);
      input.oninput = () => { q = input.value; body.querySelector('[data-results]').innerHTML = results(); };
      body.onclick = (e) => {
        const pick = e.target.closest('[data-pick]')?.dataset.pick;
        if (pick) {
          toggle(pick);
          sheet.close();
          toast('Marcado como presente');
          return;
        }
        if (e.target.closest('[data-act="new"]')) {
          sheet.close();
          openEditStudent(null, {
            presetGroupId: ui.groupId,
            presetName: q.trim(),
            onSaved: (id) => toggle(id),
          });
        }
      };
    },
  });
}
