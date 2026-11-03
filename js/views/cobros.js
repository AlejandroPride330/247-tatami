// Pestaña "Cobros": quién ha venido este mes y aún no ha pagado, separado por disciplinas
// (alguna se subcontrata y conviene ver la gente y el dinero de cada una por separado).
// Las disciplinas libres (Open Mat, Comp Class…) no salen: no se cobran.
import { getState, find } from '../store.js';
import { STATUS, monthStatus, disciplineReport, activeDisciplines, studentGroupsText, expectedAmount } from '../logic.js';
import { esc, eur, todayISO, monthOf, addMonths, monthLabel, byName } from '../util.js';
import { badge, dot, empty, monthNav, requestRender } from '../ui.js';
import { openCobrar } from './cobrar.js';
import { openFicha } from './alumnos.js';

// disc: null = resumen por disciplinas, 'all' = todos los alumnos, o el id de una disciplina.
const ui = { month: monthOf(todayISO()), disc: null, filter: 'cobrar' };
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

function renderSummary(report) {
  const freeNames = activeDisciplines().filter((d) => d.free).map((d) => d.name);
  const cobrado = report.reduce((sum, r) => sum + r.cobrado, 0);
  const pendiente = report.reduce((sum, r) => sum + r.pendiente, 0);
  const nPending = allRows().filter((r) => r.code === 'cobrar').length;

  const card = (r) => {
    const active = r.rows.filter((x) => x.code !== 'sin');
    const [pag, bono, cob, sin] = ['pagado', 'bono', 'cobrar', 'sin'].map((c) => count(r.rows, c));
    return `
      <button type="button" class="disc-card" data-disc="${r.disc.id}">
        <span class="disc-card-head">${dot(r.disc.color)}<strong>${esc(r.disc.name)}</strong>
          <span class="sub">${people(active.length)}</span><span class="chev" aria-hidden="true">›</span></span>
        <span class="bar" aria-hidden="true">
          <i class="bar-pagado" style="flex:${pag}"></i><i class="bar-bono" style="flex:${bono}"></i><i class="bar-cobrar" style="flex:${cob}"></i>
        </span>
        <span class="disc-card-counts">
          <span class="c-ok">${pag} ${pag === 1 ? 'pagado' : 'pagados'}</span>${bono ? ` · <span class="c-info">${bono} con bono</span>` : ''} · <span class="c-bad">${cob} por cobrar</span>
          ${sin ? `<span class="sub"> · ${sin} sin venir</span>` : ''}
        </span>
        <span class="disc-money">
          <span><span class="sub">Cobrado</span> <strong>${cents(r.cobrado)}</strong></span>
          <span><span class="sub">Por cobrar</span> <strong class="c-bad">${r.pendiente ? `≈ ${eur(Math.round(r.pendiente))}` : '0 €'}</strong></span>
        </span>
      </button>`;
  };

  return `
    ${monthNav(monthLabel(ui.month), { canNext: ui.month < addMonths(monthOf(todayISO()), 1) })}
    ${moneyCard(cobrado, pendiente, nPending)}
    <button type="button" class="btn btn-block" data-disc="all">Ver todos los pendientes (${nPending})</button>
    <h3 class="section-title">Por disciplina</h3>
    ${report.map(card).join('') || empty('No hay disciplinas que se cobren', 'Créalas en Ajustes.')}
    <p class="hint">
      ${freeNames.length ? `${esc(freeNames.join(' y '))} ${freeNames.length === 1 ? 'es libre' : 'son libres'}: no se cobran y no salen aquí. ` : ''}
      Las tarifas combinadas se reparten entre sus disciplinas según el precio de cada una por separado.
    </p>
    <button type="button" class="fab" data-act="cobrar-any" aria-label="Cobrar a cualquier alumno">+ Cobrar</button>`;
}

function renderDetail(report) {
  const r = ui.disc === 'all' ? null : report.find((x) => x.disc.id === ui.disc);
  const rows = r ? disciplineRows(r) : allRows();
  const pendiente = r ? r.pendiente : report.reduce((sum, x) => sum + x.pendiente, 0);
  const cobrado = r ? r.cobrado : report.reduce((sum, x) => sum + x.cobrado, 0);
  const list = rows
    .filter((x) => ui.filter === 'all' || x.code === ui.filter)
    .sort((a, b) => ORDER[a.code] - ORDER[b.code] || byName(a.st, b.st));

  // Gente por clase (Gi, Femenino, Kids…), por si alguna clase la da un profesor externo.
  const perGroup = new Map();
  if (r) rows.forEach((x) => x.groupIds.forEach((id) => perGroup.set(id, (perGroup.get(id) || 0) + 1)));
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
      <button type="button" class="btn btn-small btn-ghost back-btn" data-act="back">‹ Disciplinas</button>
      <h2>${r ? `${dot(r.disc.color)}${esc(r.disc.name)}` : 'Todas las disciplinas'}</h2>
    </div>
    ${monthNav(monthLabel(ui.month), { canNext: ui.month < addMonths(monthOf(todayISO()), 1) })}
    ${moneyCard(cobrado, pendiente, count(rows, 'cobrar'))}
    <div class="tiles">
      ${tile('cobrar', 'Por cobrar')}
      ${tile('pagado', 'Pagados')}
      ${tile('bono', 'Con bono')}
      ${tile('sin', 'Sin venir')}
    </div>
    ${groupsLine ? `<p class="hint">Han venido por clase: ${groupsLine}</p>` : ''}
    ${ui.filter === 'sin' ? '<p class="hint">Apuntados que no han venido este mes: no se les reclama nada.</p>' : ''}
    <div class="list">
      ${list.map((x) => `
        <div class="row" role="button" tabindex="0" data-sid="${x.st.id}">
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
  return ui.disc ? renderDetail(report) : renderSummary(report);
}

export function bind(root) {
  root.oninput = null;
  root.onchange = null;
  root.onclick = (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'prev-month') { ui.month = addMonths(ui.month, -1); requestRender(); return; }
    if (act === 'next-month') { ui.month = addMonths(ui.month, 1); requestRender(); return; }
    if (act === 'back') { ui.disc = null; requestRender(); window.scrollTo(0, 0); return; }
    if (act === 'cobrar-any') { openCobrar({ month: ui.month }); return; }
    const cobrar = e.target.closest('[data-cobrar]')?.dataset.cobrar;
    if (cobrar) { openCobrar({ studentId: cobrar, month: ui.month }); return; }
    const disc = e.target.closest('[data-disc]')?.dataset.disc;
    if (disc) { ui.disc = disc; ui.filter = 'cobrar'; requestRender(); window.scrollTo(0, 0); return; }
    const filter = e.target.closest('[data-filter]')?.dataset.filter;
    if (filter) { ui.filter = ui.filter === filter ? 'all' : filter; requestRender(); return; }
    const sid = e.target.closest('[data-sid]')?.dataset.sid;
    if (sid) openFicha(sid);
  };
}
