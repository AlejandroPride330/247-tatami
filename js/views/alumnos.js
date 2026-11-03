// Pestaña "Alumnos": listado, ficha y alta/edición.
import { getState, update, find } from '../store.js';
import { analysisFor, monthStatus, activeBono, activeDisciplines, activeGroups, activePlans, studentGroupsText, groupLabel } from '../logic.js';
import { esc, eur, todayISO, monthOf, addMonths, monthShort, monthLabel, dayLabel, shortDate, normalize, byName, uid } from '../util.js';
import { openSheet, toast, badge, empty, requestRender } from '../ui.js';
import { openCobrar, voidPayment } from './cobrar.js';

const ui = { q: '', filter: 'activo' };

function filtered() {
  const q = normalize(ui.q);
  return getState().students
    .filter((s) => ui.filter === 'todos' || s.status === ui.filter)
    .filter((s) => !q || normalize(s.name).includes(q))
    .sort(byName);
}

function listHTML() {
  const month = monthOf(todayISO());
  const rows = filtered().map((s) => `
    <div class="row" role="button" tabindex="0" data-sid="${s.id}">
      <span class="grow"><span class="name">${esc(s.name)}</span><span class="sub">${esc(studentGroupsText(s))}</span></span>
      ${s.status === 'baja' ? '<span class="tag">Baja</span>' : badge(monthStatus(s.id, month))}
    </div>`).join('');
  return rows || empty('No hay alumnos aquí', ui.q ? 'Prueba con otro nombre.' : '');
}

export function render() {
  const all = getState().students;
  const count = (st) => all.filter((s) => st === 'todos' || s.status === st).length;
  const seg = (id, label) => `<button type="button" class="seg-btn ${ui.filter === id ? 'on' : ''}" data-filter="${id}">${label} <small>${count(id)}</small></button>`;
  return `
    <div class="search-row">
      <input type="search" class="search" data-q placeholder="Buscar alumno…" value="${esc(ui.q)}" autocomplete="off">
      <button type="button" class="btn btn-primary" data-act="new">+ Nuevo</button>
    </div>
    <div class="seg">${seg('activo', 'Activos')}${seg('baja', 'Bajas')}${seg('todos', 'Todos')}</div>
    <div class="list" data-list>${listHTML()}</div>`;
}

export function bind(root) {
  root.oninput = (e) => {
    if (!e.target.matches('[data-q]')) return;
    ui.q = e.target.value;
    root.querySelector('[data-list]').innerHTML = listHTML();
  };
  root.onclick = (e) => {
    const filter = e.target.closest('[data-filter]')?.dataset.filter;
    if (filter) { ui.filter = filter; requestRender(); return; }
    if (e.target.closest('[data-act="new"]')) { openEditStudent(); return; }
    const sid = e.target.closest('[data-sid]')?.dataset.sid;
    if (sid) openFicha(sid);
  };
}

// --- Ficha del alumno ---

export function openFicha(studentId) {
  const sheet = openSheet({
    title: find('students', studentId)?.name || 'Alumno',
    live: true,
    render: () => {
      const st = find('students', studentId);
      if (!st) return empty('Este alumno ya no existe');
      const today = todayISO();
      const month = monthOf(today);
      const ms = monthStatus(st.id, month);
      const an = analysisFor(st.id);
      const plan = find('plans', st.planId);
      const bono = activeBono(st.id);
      const pays = getState().payments.filter((p) => p.studentId === st.id).sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
      const recent = [...an.atts].reverse().slice(0, 12);
      const months = [-3, -2, -1, 0].map((n) => addMonths(month, n));
      return `
        <div class="ficha-top">
          ${st.status === 'baja' ? '<span class="tag">Baja</span>' : badge(ms)}
          <span class="sub">${esc(studentGroupsText(st))}</span>
        </div>
        <div class="stats">
          <div class="stat"><span class="stat-n">${ms.days}</span><span class="stat-l">días en ${monthShort(month)}</span></div>
          <div class="stat"><span class="stat-n">${plan ? eur(plan.price) : '—'}</span><span class="stat-l">${esc(plan?.name || 'Sin tarifa')}</span></div>
          ${bono ? `<div class="stat"><span class="stat-n">${bono.remaining}</span><span class="stat-l">días de bono · hasta ${shortDate(bono.end)}</span></div>` : ''}
        </div>
        <div class="btn-row">
          <button type="button" class="btn btn-primary" data-act="cobrar">Cobrar</button>
          <button type="button" class="btn" data-act="edit">Editar</button>
        </div>
        ${st.notes ? `<p class="note">📝 ${esc(st.notes)}</p>` : ''}

        <h3 class="section-title">Últimos meses</h3>
        <div class="months">${months.map((m) => { const x = monthStatus(st.id, m); return `
          <div class="month-cell b-${x.code}"><strong>${monthShort(m)}</strong><span>${esc(x.label)}</span></div>`; }).join('')}
        </div>

        <h3 class="section-title">Cobros</h3>
        <div class="list">${pays.map((p) => `
          <div class="row ${p.voided ? 'voided' : ''}">
            <span class="grow">
              <span class="name">${esc(p.planName)} · ${p.type === 'mensual' ? esc(monthLabel(p.month)) : `desde ${shortDate(p.startDate)}`}</span>
              <span class="sub">${shortDate(p.date)} · ${esc(find('owners', p.by)?.name || '¿?')}${p.voided ? ` · Anulado: ${esc(p.voidReason)}` : ''}</span>
            </span>
            <span class="amount">${eur(p.amount)}</span>
            ${p.voided ? '' : `<button type="button" class="mini-btn" data-void="${p.id}" aria-label="Anular cobro">Anular</button>`}
          </div>`).join('') || '<p class="hint">Todavía no hay cobros.</p>'}
        </div>

        <h3 class="section-title">Asistencia reciente</h3>
        <div class="list">${recent.map((a) => { const g = find('groups', a.groupId); return `
          <div class="row compact">
            <span class="grow">${esc(dayLabel(a.date))} · ${esc(g ? groupLabel(g) : 'Clase eliminada')}</span>
            <span class="tag ${a.cover === 'libre' ? '' : a.cover ? 'tag-ok' : 'tag-bad'}">${{ mensual: 'Cuota', bono: 'Bono', libre: 'Libre' }[a.cover] || 'Sin pagar'}</span>
          </div>`; }).join('') || '<p class="hint">Sin asistencias registradas.</p>'}
        </div>`;
    },
    bind(body, api) {
      api.setTitle(find('students', studentId)?.name || 'Alumno');
      body.onclick = (e) => {
        const voidId = e.target.closest('[data-void]')?.dataset.void;
        if (voidId) { voidPayment(voidId); return; }
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (act === 'cobrar') openCobrar({ studentId });
        if (act === 'edit') openEditStudent(studentId);
      };
    },
  });
  return sheet;
}

// --- Alta y edición ---

export function openEditStudent(studentId = null, { presetGroupId = null, presetName = '', onSaved } = {}) {
  const existing = studentId ? find('students', studentId) : null;
  const f = existing
    ? { name: existing.name, phone: existing.phone, groupIds: new Set(existing.groupIds), planId: existing.planId || '', status: existing.status, notes: existing.notes }
    : { name: presetName, phone: '', groupIds: new Set(presetGroupId ? [presetGroupId] : []), planId: '', status: 'activo', notes: '' };

  const readInputs = (body) => {
    body.querySelectorAll('[data-f]').forEach((el) => { f[el.dataset.f] = el.value; });
  };

  openSheet({
    title: existing ? 'Editar alumno' : 'Nuevo alumno',
    render: () => {
      const groups = activeGroups();
      const plans = activePlans();
      // Si tiene una clase archivada, la seguimos mostrando para no perderla al guardar.
      const extra = [...f.groupIds].map((id) => find('groups', id)).filter((g) => g && !groups.includes(g));
      return `
        <label class="field"><span>Nombre y apellidos</span><input type="text" data-f="name" value="${esc(f.name)}" autocomplete="off"></label>
        <label class="field"><span>Teléfono (opcional)</span><input type="tel" data-f="phone" value="${esc(f.phone)}" inputmode="tel"></label>
        <div class="field"><span>Clases</span>
          ${activeDisciplines().map((d) => {
            const gs = groups.filter((g) => g.disciplineId === d.id);
            if (!gs.length) return '';
            return `<div class="chips wrap">${gs.map((g) => `
              <button type="button" class="chip ${f.groupIds.has(g.id) ? 'on' : ''}" data-gid="${g.id}">${esc(groupLabel(g))}</button>`).join('')}</div>`;
          }).join('')}
          ${extra.length ? `<div class="chips wrap">${extra.map((g) => `<button type="button" class="chip on" data-gid="${g.id}">${esc(groupLabel(g))} (archivada)</button>`).join('')}</div>` : ''}
        </div>
        <label class="field"><span>Tarifa habitual</span>
          <select data-f="planId">
            <option value="">Sin tarifa fija</option>
            ${plans.map((p) => `<option value="${p.id}" ${p.id === f.planId ? 'selected' : ''}>${esc(p.name)} · ${eur(p.price)}</option>`).join('')}
          </select>
        </label>
        <div class="field"><span>Situación</span>
          <div class="seg">
            <button type="button" class="seg-btn ${f.status === 'activo' ? 'on' : ''}" data-status="activo">Activo</button>
            <button type="button" class="seg-btn ${f.status === 'baja' ? 'on' : ''}" data-status="baja">Baja</button>
          </div>
          <span class="hint">Las bajas no salen al pasar lista. Si vuelve, al marcarle vuelve a estar activo.</span>
        </div>
        <label class="field"><span>Notas</span><textarea data-f="notes" rows="2" placeholder="Ej.: paga su madre">${esc(f.notes)}</textarea></label>
        <button type="button" class="btn btn-primary btn-block" data-act="save">${existing ? 'Guardar cambios' : 'Crear alumno'}</button>`;
    },
    bind(body, api) {
      if (!existing) setTimeout(() => body.querySelector('[data-f="name"]')?.focus(), 50);
      body.onclick = (e) => {
        const gid = e.target.closest('[data-gid]')?.dataset.gid;
        const status = e.target.closest('[data-status]')?.dataset.status;
        if (gid || status) {
          readInputs(body);
          if (gid) { if (f.groupIds.has(gid)) f.groupIds.delete(gid); else f.groupIds.add(gid); }
          if (status) f.status = status;
          api.refresh();
          return;
        }
        if (e.target.closest('[data-act="save"]')) {
          readInputs(body);
          const name = f.name.trim();
          if (!name) { toast('Escribe el nombre'); return; }
          const data = { name, phone: f.phone.trim(), groupIds: [...f.groupIds], planId: f.planId || null, status: f.status, notes: f.notes.trim() };
          let id = studentId;
          update((s) => {
            if (existing) Object.assign(s.students.find((x) => x.id === studentId), data);
            else { id = uid('stu'); s.students.push({ id, ...data, createdAt: todayISO() }); }
          });
          api.close();
          toast(existing ? 'Cambios guardados' : `${name} dado de alta`);
          onSaved?.(id);
        }
      };
    },
  });
}
