// Pestaña "Ajustes": todo lo configurable por el gimnasio (disciplinas, clases, tarifas, socios).
// Nada se borra si tiene historial: se archiva, para no alterar cobros ni asistencias pasadas.
import { getState, update, replace, find, isValid } from '../store.js';
import { planSummary, groupLabel } from '../logic.js';
import { createSeed } from '../seed.js';
import { esc, eur, todayISO, scheduleText, WEEK, uid } from '../util.js';
import { openSheet, confirmSheet, toast, dot } from '../ui.js';

const COLORS = ['#b91c1c', '#1d4ed8', '#15803d', '#a16207', '#7c3aed', '#0e7490', '#be185d', '#4b5563'];

export function render() {
  const s = getState();
  return `
    <section class="card">
      <h3 class="card-title">Gimnasio</h3>
      <label class="field"><span>Nombre</span><input type="text" data-gym value="${esc(s.gymName)}"></label>
    </section>

    <section class="card">
      <h3 class="card-title">Socios que cobran</h3>
      ${s.owners.map((o) => `
        <label class="field inline"><span>${o.id === s.currentOwnerId ? '👤' : ''}</span><input type="text" data-owner="${o.id}" value="${esc(o.name)}"></label>`).join('')}
      <button type="button" class="btn btn-small" data-act="add-owner">+ Añadir socio</button>
    </section>

    <section class="card">
      <h3 class="card-title">Disciplinas y clases</h3>
      ${s.disciplines.map((d) => {
        const groups = s.groups.filter((g) => g.disciplineId === d.id);
        return `
        <div class="disc ${d.archived ? 'archived' : ''}">
          <div class="disc-head" role="button" tabindex="0" data-disc="${d.id}">
            ${dot(d.color)}<strong>${esc(d.name)}</strong>${d.free ? '<span class="tag">Libre · no se cobra</span>' : ''}${d.archived ? '<span class="tag">Archivada</span>' : ''}<span class="edit">Editar</span>
          </div>
          ${groups.map((g) => `
            <div class="row compact ${g.archived ? 'archived' : ''}" role="button" tabindex="0" data-group="${g.id}">
              <span class="grow">${esc(g.name || d.name)} <span class="sub">${esc(scheduleText(g.sessions))}</span></span>
              ${g.archived ? '<span class="tag">Archivada</span>' : ''}<span class="edit">Editar</span>
            </div>`).join('')}
          ${d.archived ? '' : `<button type="button" class="btn btn-small btn-ghost" data-new-group="${d.id}">+ Clase de ${esc(d.name)}</button>`}
        </div>`;
      }).join('')}
      <button type="button" class="btn btn-small" data-act="new-disc">+ Nueva disciplina</button>
    </section>

    <section class="card">
      <h3 class="card-title">Tarifas</h3>
      <p class="hint">Si cambias un precio, los cobros anteriores conservan el importe que se cobró.</p>
      ${s.plans.map((p) => `
        <div class="row compact ${p.active ? '' : 'archived'}" role="button" tabindex="0" data-plan="${p.id}">
          <span class="grow"><span class="name">${esc(p.name)}</span><span class="sub">${p.type === 'bono' ? 'Bono · ' : 'Mensual · '}${esc(planSummary(p))}</span></span>
          ${p.active ? '' : '<span class="tag">Oculta</span>'}
          <span class="amount">${eur(p.price)}</span>
        </div>`).join('')}
      <button type="button" class="btn btn-small" data-act="new-plan">+ Nueva tarifa</button>
    </section>

    <section class="card">
      <h3 class="card-title">Datos</h3>
      <p class="hint">En esta demo los datos se guardan solo en este móvil.</p>
      <div class="stack">
        <button type="button" class="btn" data-act="export">Descargar copia de seguridad</button>
        <label class="btn">Restaurar una copia<input type="file" accept="application/json,.json" data-import hidden></label>
        <button type="button" class="btn" data-act="reset">Volver a los datos de ejemplo</button>
        <button type="button" class="btn btn-danger" data-act="wipe">Empezar con datos reales (vaciar alumnos y cobros)</button>
      </div>
    </section>
    <p class="foot">Tatami · demo v0.1</p>`;
}

export function bind(root) {
  root.oninput = null;
  root.onchange = (e) => {
    const t = e.target;
    if (t.matches('[data-gym]')) {
      update((s) => { s.gymName = t.value.trim() || 'Mi gimnasio'; });
      toast('Nombre guardado');
    }
    if (t.dataset.owner) {
      update((s) => { s.owners.find((o) => o.id === t.dataset.owner).name = t.value.trim() || 'Socio'; });
      toast('Socio guardado');
    }
    if (t.matches('[data-import]') && t.files[0]) importBackup(t.files[0]);
  };
  root.onclick = async (e) => {
    const el = e.target.closest('[data-act],[data-disc],[data-group],[data-new-group],[data-plan]');
    if (!el) return;
    const { act } = el.dataset;
    if (el.dataset.disc) editDiscipline(el.dataset.disc);
    else if (el.dataset.group) editGroup(el.dataset.group);
    else if (el.dataset.newGroup) editGroup(null, el.dataset.newGroup);
    else if (el.dataset.plan) editPlan(el.dataset.plan);
    else if (act === 'new-disc') editDiscipline(null);
    else if (act === 'new-plan') editPlan(null);
    else if (act === 'add-owner') update((s) => { s.owners.push({ id: uid('own'), name: `Socio ${s.owners.length + 1}` }); });
    else if (act === 'export') exportBackup();
    else if (act === 'reset') {
      if (await confirmSheet({ title: 'Datos de ejemplo', message: 'Se borrará todo lo que hayas apuntado y se cargarán de nuevo los alumnos de ejemplo.', confirmLabel: 'Cargar ejemplo', danger: true })) {
        replace(createSeed());
        toast('Datos de ejemplo cargados');
      }
    } else if (act === 'wipe') {
      if (await confirmSheet({ title: 'Empezar de cero', message: 'Se borrarán los alumnos, asistencias y cobros. Se mantienen las disciplinas, clases, tarifas y socios.', confirmLabel: 'Vaciar', danger: true })) {
        update((s) => { s.students = []; s.attendance = []; s.payments = []; });
        toast('Listo para datos reales');
      }
    }
  };
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `tatami-copia-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importBackup(file) {
  let data = null;
  try { data = JSON.parse(await file.text()); } catch { /* se valida abajo */ }
  if (!isValid(data)) { toast('Ese archivo no es una copia válida'); return; }
  if (await confirmSheet({ title: 'Restaurar copia', message: `Se sustituirán los datos actuales por la copia (${data.students.length} alumnos).`, confirmLabel: 'Restaurar', danger: true })) {
    replace(data);
    toast('Copia restaurada');
  }
}

// --- Editores ---

function editDiscipline(id) {
  const d = id ? find('disciplines', id) : null;
  const f = { name: d?.name || '', color: d?.color || COLORS[getState().disciplines.length % COLORS.length], free: !!d?.free };
  openSheet({
    title: d ? 'Editar disciplina' : 'Nueva disciplina',
    render: () => `
      <label class="field"><span>Nombre</span><input type="text" data-f="name" value="${esc(f.name)}" placeholder="Ej.: Judo"></label>
      <div class="field"><span>Color</span><div class="swatches">${COLORS.map((c) => `
        <button type="button" class="swatch ${c === f.color ? 'on' : ''}" style="background:${c}" data-color="${c}" aria-label="Color ${c}"></button>`).join('')}</div></div>
      <label class="check-line"><input type="checkbox" data-f="free" ${f.free ? 'checked' : ''}> Libre: se pasa lista pero no se cobra (Open Mat, Comp Class…)</label>
      ${d ? '' : '<p class="hint">Se creará con una clase vacía: después añádele el horario.</p>'}
      <button type="button" class="btn btn-primary btn-block" data-act="save">Guardar</button>
      ${d ? `<button type="button" class="btn btn-block btn-ghost" data-act="archive">${d.archived ? 'Recuperar disciplina' : 'Archivar disciplina'}</button>` : ''}`,
    bind(body, api) {
      body.onclick = (e) => {
        f.name = body.querySelector('[data-f="name"]').value;
        f.free = body.querySelector('[data-f="free"]').checked;
        const color = e.target.closest('[data-color]')?.dataset.color;
        if (color) { f.color = color; api.refresh(); return; }
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (act === 'save') {
          if (!f.name.trim()) { toast('Escribe el nombre'); return; }
          update((s) => {
            if (d) Object.assign(s.disciplines.find((x) => x.id === id), { name: f.name.trim(), color: f.color, free: f.free });
            else {
              const did = uid('dis');
              s.disciplines.push({ id: did, name: f.name.trim(), color: f.color, free: f.free, archived: false });
              s.groups.push({ id: uid('grp'), disciplineId: did, name: '', sessions: [], archived: false });
            }
          });
          api.close();
          toast('Disciplina guardada');
        }
        if (act === 'archive') {
          update((s) => { const x = s.disciplines.find((y) => y.id === id); x.archived = !x.archived; });
          api.close();
          toast(d.archived ? 'Disciplina archivada' : 'Disciplina recuperada');
        }
      };
    },
  });
}

function editGroup(id, disciplineId = null) {
  const g = id ? find('groups', id) : null;
  const f = {
    name: g?.name || '',
    disciplineId: g?.disciplineId || disciplineId,
    sessions: (g?.sessions || []).map((s) => ({ ...s })),
  };
  const DAY_NAMES = { 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado', 0: 'Domingo' };
  const read = (body) => {
    f.name = body.querySelector('[data-f="name"]').value;
    f.disciplineId = body.querySelector('[data-f="disciplineId"]').value;
    body.querySelectorAll('[data-sess]').forEach((row) => {
      const s = f.sessions[Number(row.dataset.sess)];
      s.day = Number(row.querySelector('[data-k="day"]').value);
      s.start = row.querySelector('[data-k="start"]').value || s.start;
      s.end = row.querySelector('[data-k="end"]').value || s.end;
    });
  };
  openSheet({
    title: g ? `Editar ${groupLabel(g)}` : 'Nueva clase',
    render: () => `
      <label class="field"><span>Disciplina</span>
        <select data-f="disciplineId">${getState().disciplines.filter((d) => !d.archived || d.id === f.disciplineId).map((d) => `
          <option value="${d.id}" ${d.id === f.disciplineId ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}
        </select>
      </label>
      <label class="field"><span>Nombre de la clase (opcional)</span><input type="text" data-f="name" value="${esc(f.name)}" placeholder="Ej.: Kids 1 (+7 años), Femenino"></label>
      <div class="field"><span>Horario</span>
        ${f.sessions.map((s, i) => `
          <div class="sess-row" data-sess="${i}">
            <select data-k="day" aria-label="Día">${WEEK.map(([n]) => `<option value="${n}" ${n === s.day ? 'selected' : ''}>${DAY_NAMES[n]}</option>`).join('')}</select>
            <input type="time" data-k="start" value="${s.start}" aria-label="Empieza">
            <input type="time" data-k="end" value="${s.end}" aria-label="Termina">
            <button type="button" class="icon-btn" data-del="${i}" aria-label="Quitar horario">✕</button>
          </div>`).join('') || '<span class="hint">Sin horario: solo saldrá en "Otra clase".</span>'}
        <button type="button" class="btn btn-small" data-act="add-sess">+ Añadir horario</button>
      </div>
      <button type="button" class="btn btn-primary btn-block" data-act="save">Guardar</button>
      ${g ? `<button type="button" class="btn btn-block btn-ghost" data-act="archive">${g.archived ? 'Recuperar clase' : 'Archivar clase'}</button>` : ''}`,
    bind(body, api) {
      body.onclick = (e) => {
        const del = e.target.closest('[data-del]')?.dataset.del;
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (del === undefined && !act) return;
        read(body);
        if (del !== undefined) { f.sessions.splice(Number(del), 1); api.refresh(); return; }
        if (act === 'add-sess') {
          const last = f.sessions[f.sessions.length - 1];
          f.sessions.push(last ? { ...last, day: (last.day % 6) + 1 } : { day: 1, start: '18:30', end: '19:30' });
          api.refresh();
          return;
        }
        if (act === 'save') {
          if (f.sessions.some((s) => s.end <= s.start)) { toast('Revisa las horas: el final debe ser después del inicio'); return; }
          const data = { name: f.name.trim(), disciplineId: f.disciplineId, sessions: f.sessions };
          update((s) => {
            if (g) Object.assign(s.groups.find((x) => x.id === id), data);
            else s.groups.push({ id: uid('grp'), ...data, archived: false });
          });
          api.close();
          toast('Clase guardada');
        }
        if (act === 'archive') {
          update((s) => { const x = s.groups.find((y) => y.id === id); x.archived = !x.archived; });
          api.close();
          toast(g.archived ? 'Clase archivada' : 'Clase recuperada');
        }
      };
    },
  });
}

function editPlan(id) {
  const p = id ? find('plans', id) : null;
  const f = p
    ? { name: p.name, type: p.type, price: p.price, disciplineIds: new Set(p.disciplineIds), sessions: p.sessions || 8, validityDays: p.validityDays || 30, active: p.active }
    : { name: '', type: 'mensual', price: 0, disciplineIds: new Set(), sessions: 8, validityDays: 30, active: true };
  const read = (body) => body.querySelectorAll('[data-f]').forEach((el) => {
    f[el.dataset.f] = el.type === 'number' ? Number(el.value) || 0 : el.value;
  });
  openSheet({
    title: p ? 'Editar tarifa' : 'Nueva tarifa',
    render: () => `
      <label class="field"><span>Nombre</span><input type="text" data-f="name" value="${esc(f.name)}" placeholder="Ej.: BJJ + MMA"></label>
      <div class="field"><span>Tipo</span><div class="seg">
        <button type="button" class="seg-btn ${f.type === 'mensual' ? 'on' : ''}" data-type="mensual">Cuota mensual</button>
        <button type="button" class="seg-btn ${f.type === 'bono' ? 'on' : ''}" data-type="bono">Bono de días</button>
      </div></div>
      <label class="field"><span>Precio</span><input type="number" inputmode="decimal" min="0" step="0.5" data-f="price" value="${f.price}"></label>
      <div class="field"><span>Disciplinas que incluye</span>
        <div class="chips wrap">${getState().disciplines.filter((d) => (!d.archived && !d.free) || f.disciplineIds.has(d.id)).map((d) => `
          <button type="button" class="chip ${f.disciplineIds.has(d.id) ? 'on' : ''}" data-did="${d.id}">${dot(d.color)}${esc(d.name)}</button>`).join('')}</div>
      </div>
      ${f.type === 'bono' ? `
        <div class="two">
          <label class="field"><span>Nº de días</span><input type="number" inputmode="numeric" min="1" data-f="sessions" value="${f.sessions}"></label>
          <label class="field"><span>Caduca a los (días)</span><input type="number" inputmode="numeric" min="1" data-f="validityDays" value="${f.validityDays}"></label>
        </div>` : '<p class="hint">Cubre el mes natural completo, pague el día que pague.</p>'}
      <div class="field"><span>Disponible al cobrar</span><div class="seg">
        <button type="button" class="seg-btn ${f.active ? 'on' : ''}" data-active="1">Sí</button>
        <button type="button" class="seg-btn ${f.active ? '' : 'on'}" data-active="0">Oculta</button>
      </div></div>
      <button type="button" class="btn btn-primary btn-block" data-act="save">Guardar</button>`,
    bind(body, api) {
      body.onclick = (e) => {
        const t = e.target.closest('[data-type],[data-did],[data-active],[data-act]');
        if (!t) return;
        read(body);
        if (t.dataset.type) { f.type = t.dataset.type; api.refresh(); return; }
        if (t.dataset.did) { const x = t.dataset.did; if (f.disciplineIds.has(x)) f.disciplineIds.delete(x); else f.disciplineIds.add(x); api.refresh(); return; }
        if (t.dataset.active) { f.active = t.dataset.active === '1'; api.refresh(); return; }
        if (t.dataset.act === 'save') {
          if (!f.name.trim()) { toast('Escribe el nombre'); return; }
          if (!f.disciplineIds.size) { toast('Elige al menos una disciplina'); return; }
          const data = {
            name: f.name.trim(), type: f.type, price: Math.max(0, f.price), disciplineIds: [...f.disciplineIds], active: f.active,
            sessions: f.type === 'bono' ? Math.max(1, f.sessions) : null,
            validityDays: f.type === 'bono' ? Math.max(1, f.validityDays) : null,
          };
          update((s) => {
            if (p) Object.assign(s.plans.find((x) => x.id === id), data);
            else s.plans.push({ id: uid('pln'), ...data });
          });
          api.close();
          toast('Tarifa guardada');
        }
      };
    },
  });
}
