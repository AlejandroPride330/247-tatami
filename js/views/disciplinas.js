// Pestaña "Disciplinas": una tarjeta por disciplina. Al entrar se ve quién ha pagado y quién debe
// este mes (alguna se subcontrata y conviene ver la gente y el dinero de cada una por separado).
// Si una disciplina tiene varias clases (BJJ: Gi, Femenino, Kids 1, Kids 2), al entrar se elige la clase
// y cada una tiene su propio listado de alumnos.
// Las disciplinas libres (Open Mat, Comp Class…) no salen: no se cobran.
import { getState, find, defaultIcon } from '../store.js';
import { STATUS, monthStatus, disciplineReport, activeDisciplines, activeGroups, studentGroupsText, expectedAmount } from '../logic.js';
import { esc, eur, todayISO, monthOf, addMonths, monthLabel, byName, scheduleText } from '../util.js';
import { badge, empty, avatar, monthNav, requestRender } from '../ui.js';
import { openCobrar } from './cobrar.js';
import { openFicha } from './alumnos.js';

// disc: null = resumen por disciplinas, 'all' = todos los alumnos, o el id de una disciplina.
// group: null = elegir clase (si la disciplina tiene varias), 'all' = toda la disciplina, o el id de una clase.
const ui = { month: monthOf(todayISO()), disc: null, group: null, filter: 'cobrar' };
const groupsOf = (discId) => activeGroups().filter((g) => g.disciplineId === discId);
const discIcon = (d) => `<span class="disc-icon sm" style="--c:${esc(d.color)}" aria-hidden="true">${esc(d.icon || defaultIcon(d.name))}</span>`;
const ORDER = { cobrar: 0, bono: 1, pagado: 2, sin: 3 };
const count = (rows, code) => rows.filter((r) => r.code === code).length;
const people = (n) => `${n} ${n === 1 ? 'alumno' : 'alumnos'}`;
// Lo cobrado, con céntimos para que la suma de disciplinas cuadre con la caja; lo pendiente es aproximado.
const cents = (n) => eur(Math.round(n * 100) / 100);

function allRows() {
  return getState().students
    .map((st) => {
      const ms = monthStatus(st.id, ui.month);
      return { st, code: ms.code, days: ms.days, sub: studentGroupsText(st) };
    })
    // Las bajas solo cuentan si ese mes tuvieron actividad.
    .filter(({ st, code }) => st.status === 'activo' || code !== 'sin');
}

function disciplineRows(r) {
  return r.rows.map((x) => {
    const ids = x.groupIds.length ? x.groupIds : x.st.groupIds.filter((id) => find('groups', id)?.disciplineId === r.disc.id);
    const names = ids.map((id) => find('groups', id)).filter(Boolean).map((g) => g.name || r.disc.name);
    return { ...x, sub: names.join(', ') };
  });
}

const moneyCard = (cobrado, pendiente, nPending) => `
  <div class="money-card">
    <div class="money"><span class="money-l">Cobrado</span><strong class="money-n c-ok">${cents(cobrado)}</strong></div>
    <div class="money"><span class="money-l">Por cobrar</span><strong class="money-n c-bad">${pendiente ? `≈ ${eur(Math.round(pendiente))}` : '0 €'}</strong>
      <span class="sub">${people(nPending)}</span></div>
  </div>`;

// Portada: una tarjeta sencilla por disciplina (icono y nombre). Los números salen al entrar.
function renderSummary(report) {
  const freeNames = activeDisciplines().filter((d) => d.free).map((d) => d.name);
  const card = (id, icon, name, color) => `
    <button type="button" class="disc-tile" data-disc="${id}" style="--c:${esc(color)}">
      <span class="disc-icon" aria-hidden="true">${esc(icon)}</span>
      <span class="disc-name">${esc(name)}</span>
    </button>`;
  return `
    <div class="disc-grid">
      ${report.map((r) => card(r.disc.id, r.disc.icon || defaultIcon(r.disc.name), r.disc.name, r.disc.color)).join('')}
      ${report.length ? card('all', '👥', 'Todos los alumnos', '#78716c') : ''}
    </div>
    ${report.length ? '' : empty('No hay disciplinas que se cobren', 'Créalas en Ajustes.')}
    ${freeNames.length ? `<p class="hint">${esc(freeNames.join(' y '))} ${freeNames.length === 1 ? 'es libre' : 'son libres'}: se pasa lista, pero no se cobran y no salen aquí.</p>` : ''}
    <button type="button" class="fab" data-act="cobrar-any" aria-label="Cobrar a cualquier alumno">+ Cobrar</button>`;
}

// Segundo nivel: las clases de una disciplina (Gi, Femenino, Kids 1…), cada una con su tarjeta.
function renderGroups(r) {
  const d = r.disc;
  const card = (id, name, sub) => `
    <button type="button" class="disc-tile" data-group="${id}" style="--c:${esc(d.color)}">
      <span class="disc-icon" aria-hidden="true">${esc(d.icon || defaultIcon(d.name))}</span>
      <span class="disc-name">${esc(name)}</span>
      ${sub ? `<span class="sub">${esc(sub)}</span>` : ''}
    </button>`;
  return `
    <div class="detail-head">
      <button type="button" class="btn btn-small btn-ghost back-btn" data-act="back">‹ Disciplinas</button>
      <h2>${discIcon(d)}${esc(d.name)}</h2>
    </div>
    <div class="disc-grid">
      ${groupsOf(d.id).map((g) => card(g.id, g.name || d.name, scheduleText(g.sessions))).join('')}
      ${card('all', `Todo ${d.name}`, 'Todas sus clases juntas')}
    </div>
    <button type="button" class="fab" data-act="cobrar-any" aria-label="Cobrar a cualquier alumno">+ Cobrar</button>`;
}

function renderDetail(report) {
  const r = ui.disc === 'all' ? null : report.find((x) => x.disc.id === ui.disc);
  const group = r && ui.group !== 'all' ? find('groups', ui.group) : null;
  const multi = r && groupsOf(r.disc.id).length > 1;
  let rows = r ? disciplineRows(r) : allRows();
  // En una clase: los apuntados a ella y los que han venido este mes.
  if (group) rows = rows.filter((x) => x.st.groupIds.includes(group.id) || x.groupIds.includes(group.id));
  const sum = (key) => rows.reduce((t, x) => t + (x[key] || 0), 0);
  const pendiente = group ? sum('owe') : r ? r.pendiente : report.reduce((t, x) => t + x.pendiente, 0);
  const cobrado = group ? sum('paid') : r ? r.cobrado : report.reduce((t, x) => t + x.cobrado, 0);
  const list = rows
    .filter((x) => ui.filter === 'all' || x.code === ui.filter)
    .sort((a, b) => ORDER[a.code] - ORDER[b.code] || byName(a.st, b.st));

  // Gente por clase (Gi, Femenino, Kids…), por si alguna clase la da un profesor externo.
  const perGroup = new Map();
  if (r && !group) rows.forEach((x) => x.groupIds.forEach((id) => perGroup.set(id, (perGroup.get(id) || 0) + 1)));
  const groupsLine = [...perGroup].map(([id, n]) => `${esc(find('groups', id)?.name || r.disc.name)} ${n}`).join(' · ');

  const tile = (code, title) => `
    <button type="button" class="tile t-${code} ${ui.filter === code ? 'on' : ''}" data-filter="${code}">
      <span class="tile-n">${count(rows, code)}</span><span class="tile-l">${title}</span>
    </button>`;
  const label = (x) => {
    const ms = monthStatus(x.st.id, ui.month);
    return ms.code === x.code ? ms : { code: x.code, label: STATUS[x.code] };
  };

  return `
    <div class="detail-head">
      <button type="button" class="btn btn-small btn-ghost back-btn" data-act="back">‹ ${multi ? esc(r.disc.name) : 'Disciplinas'}</button>
      <h2>${r ? `${discIcon(r.disc)}${esc(r.disc.name)}${group ? ` · ${esc(group.name || r.disc.name)}` : multi ? ' · Todas las clases' : ''}` : 'Todos los alumnos'}</h2>
    </div>
    ${monthNav(monthLabel(ui.month), { canNext: ui.month < addMonths(monthOf(todayISO()), 1) })}
    <div class="tiles">
      ${tile('cobrar', 'Por cobrar')}
      ${tile('pagado', 'Pagados')}
      ${tile('bono', 'Con bono')}
      ${tile('sin', 'Sin venir')}
    </div>
    ${moneyCard(cobrado, pendiente, count(rows, 'cobrar'))}
    ${groupsLine ? `<p class="hint">Han venido por clase: ${groupsLine}</p>` : ''}
    ${ui.filter === 'sin' ? '<p class="hint">Apuntados que no han venido este mes: no se les reclama nada.</p>' : ''}
    <div class="list">
      ${list.map((x) => `
        <div class="row" role="button" tabindex="0" data-sid="${x.st.id}">
          ${avatar(x.st)}
          <span class="grow">
            <span class="name">${esc(x.st.name)}</span>
            <span class="sub">${esc(x.sub)}${x.days ? ` · ${x.days} ${x.days === 1 ? 'día' : 'días'}` : ''}</span>
          </span>
          ${x.code === 'cobrar'
            ? `<button type="button" class="btn btn-small btn-primary" data-cobrar="${x.st.id}">Cobrar${expectedAmount(x.st) ? ` ${eur(expectedAmount(x.st))}` : ''}</button>`
            : badge(label(x))}
        </div>`).join('') || empty(ui.filter === 'cobrar' ? '¡Nadie pendiente!' : 'Nadie en este grupo')}
    </div>
    ${ui.filter !== 'all' ? '<button type="button" class="btn btn-block btn-ghost" data-filter="all">Ver todos</button>' : ''}
    <button type="button" class="fab" data-act="cobrar-any" aria-label="Cobrar a cualquier alumno">+ Cobrar</button>`;
}

export function render() {
  const report = disciplineReport(ui.month);
  if (ui.disc && ui.disc !== 'all' && !report.some((r) => r.disc.id === ui.disc)) ui.disc = null;
  if (!ui.disc) return renderSummary(report);
  if (ui.disc === 'all') return renderDetail(report);
  const r = report.find((x) => x.disc.id === ui.disc);
  const groups = groupsOf(ui.disc);
  if (ui.group && ui.group !== 'all' && !groups.some((g) => g.id === ui.group)) ui.group = null;
  if (groups.length < 2) ui.group = 'all';
  return ui.group ? renderDetail(report) : renderGroups(r);
}

export function bind(root) {
  root.oninput = null;
  root.onchange = null;
  root.onclick = (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'prev-month') { ui.month = addMonths(ui.month, -1); requestRender(); return; }
    if (act === 'next-month') { ui.month = addMonths(ui.month, 1); requestRender(); return; }
    if (act === 'back') {
      // Desde una clase se vuelve a las clases de su disciplina; desde ahí, a las disciplinas.
      if (ui.disc && ui.disc !== 'all' && ui.group && groupsOf(ui.disc).length > 1) ui.group = null;
      else { ui.disc = null; ui.group = null; }
      requestRender();
      window.scrollTo(0, 0);
      return;
    }
    const group = e.target.closest('[data-group]')?.dataset.group;
    if (group) { ui.group = group; ui.filter = 'cobrar'; requestRender(); window.scrollTo(0, 0); return; }
    if (act === 'cobrar-any') { openCobrar({ month: ui.month }); return; }
    const cobrar = e.target.closest('[data-cobrar]')?.dataset.cobrar;
    if (cobrar) { openCobrar({ studentId: cobrar, month: ui.month }); return; }
    const disc = e.target.closest('[data-disc]')?.dataset.disc;
    if (disc) { ui.disc = disc; ui.group = null; ui.filter = 'cobrar'; requestRender(); window.scrollTo(0, 0); return; }
    const filter = e.target.closest('[data-filter]')?.dataset.filter;
    if (filter) { ui.filter = ui.filter === filter ? 'all' : filter; requestRender(); return; }
    const sid = e.target.closest('[data-sid]')?.dataset.sid;
    if (sid) openFicha(sid);
  };
}
