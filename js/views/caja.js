// Pestaña "Caja": el efectivo cobrado en el mes, por socio y por tarifa.
import { getState, find } from '../store.js';
import { esc, eur, todayISO, monthOf, addMonths, monthLabel, monthShort, dayLabel, shortDate } from '../util.js';
import { openSheet, empty, monthNav, requestRender } from '../ui.js';
import { voidPayment } from './cobrar.js';
import { openFicha } from './alumnos.js';

const ui = { month: monthOf(todayISO()) };

export function render() {
  const s = getState();
  const inMonth = s.payments.filter((p) => p.date.startsWith(ui.month));
  const valid = inMonth.filter((p) => !p.voided);
  const total = valid.reduce((sum, p) => sum + p.amount, 0);
  const sumBy = (key) => {
    const map = new Map();
    valid.forEach((p) => map.set(key(p), (map.get(key(p)) || 0) + p.amount));
    return map;
  };
  const byOwner = sumBy((p) => p.by);
  const byPlan = [...sumBy((p) => p.planName)].sort((a, b) => b[1] - a[1]);
  const days = [...new Set(inMonth.map((p) => p.date))].sort().reverse();

  return `
    ${monthNav(monthLabel(ui.month), { canNext: ui.month < monthOf(todayISO()) })}
    <div class="card total-card">
      <span class="total-l">Cobrado en ${esc(monthLabel(ui.month))}</span>
      <span class="total-n">${eur(total)}</span>
      <span class="sub">${valid.length} cobros en efectivo</span>
    </div>

    <h3 class="section-title">Efectivo por socio</h3>
    <div class="owners">${s.owners.map((o) => `
      <div class="card owner"><span class="sub">${esc(o.name)}</span><strong>${eur(byOwner.get(o.id) || 0)}</strong></div>`).join('')}
    </div>

    <h3 class="section-title">Por tarifa</h3>
    <div class="card">${byPlan.map(([name, sum]) => `
      <div class="line"><span>${esc(name)}</span><strong>${eur(sum)}</strong></div>`).join('') || '<p class="hint">Sin cobros este mes.</p>'}
    </div>

    <h3 class="section-title">Movimientos</h3>
    ${days.map((d) => {
      const list = inMonth.filter((p) => p.date === d).sort((a, b) => b.createdAt - a.createdAt);
      const dayTotal = list.filter((p) => !p.voided).reduce((sum, p) => sum + p.amount, 0);
      return `
        <div class="day-head"><span>${esc(dayLabel(d))}</span><span>${eur(dayTotal)}</span></div>
        <div class="list">${list.map((p) => `
          <div class="row ${p.voided ? 'voided' : ''}" role="button" tabindex="0" data-pid="${p.id}">
            <span class="grow">
              <span class="name">${esc(find('students', p.studentId)?.name || 'Alumno eliminado')}</span>
              <span class="sub">${esc(p.planName)} · ${p.type === 'mensual' ? monthShort(p.month) : `desde ${shortDate(p.startDate)}`} · ${esc(find('owners', p.by)?.name || '¿?')}${p.voided ? ` · Anulado: ${esc(p.voidReason)}` : ''}</span>
            </span>
            <span class="amount">${eur(p.amount)}</span>
          </div>`).join('')}
        </div>`;
    }).join('') || empty('Sin movimientos este mes')}`;
}

export function bind(root) {
  root.oninput = null;
  root.onchange = null;
  root.onclick = (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'prev-month') { ui.month = addMonths(ui.month, -1); requestRender(); return; }
    if (act === 'next-month') { ui.month = addMonths(ui.month, 1); requestRender(); return; }
    const pid = e.target.closest('[data-pid]')?.dataset.pid;
    if (pid) openMovement(pid);
  };
}

function openMovement(paymentId) {
  const p = find('payments', paymentId);
  const sheet = openSheet({
    title: 'Cobro',
    render: () => `
      <div class="card">
        <div class="line"><span>Alumno</span><strong>${esc(find('students', p.studentId)?.name || '—')}</strong></div>
        <div class="line"><span>Tarifa</span><strong>${esc(p.planName)}</strong></div>
        <div class="line"><span>${p.type === 'mensual' ? 'Mes' : 'Empieza'}</span><strong>${p.type === 'mensual' ? esc(monthLabel(p.month)) : shortDate(p.startDate)}</strong></div>
        <div class="line"><span>Importe</span><strong>${eur(p.amount)}</strong></div>
        <div class="line"><span>Cobrado por</span><strong>${esc(find('owners', p.by)?.name || '—')} · ${shortDate(p.date)}</strong></div>
        ${p.voided ? `<div class="line"><span>Anulado</span><strong>${esc(p.voidReason)}${p.voidedBy ? ` (${esc(find('owners', p.voidedBy)?.name || '')})` : ''}</strong></div>` : ''}
      </div>
      <div class="btn-row">
        <button type="button" class="btn" data-act="student">Ver alumno</button>
        ${p.voided ? '' : '<button type="button" class="btn btn-danger" data-act="void">Anular cobro</button>'}
      </div>`,
    bind(body) {
      body.onclick = (e) => {
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (act === 'student') { sheet.close(); openFicha(p.studentId); }
        if (act === 'void') { sheet.close(); voidPayment(p.id); }
      };
    },
  });
}
