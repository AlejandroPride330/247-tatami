// Hoja "Cobrar": registrar una cuota mensual (uno o varios meses) o un bono.
import { getState, update, find, currentOwner } from '../store.js';
import { analysisFor, activeBono, activePlans, studentGroupsText, planSummary } from '../logic.js';
import { esc, eur, todayISO, monthOf, addMonths, monthShort, monthName, addDays, shortDate, normalize, byName, uid } from '../util.js';
import { openSheet, promptSheet, toast } from '../ui.js';

export function openCobrar({ studentId = null, month = null } = {}) {
  const today = todayISO();
  const current = monthOf(today);
  const baseMonth = month || current;
  const f = { sid: null, planId: null, months: new Set(), amount: 0, bonoStart: today, makeDefault: true, q: '' };

  const student = () => find('students', f.sid);
  const plan = () => find('plans', f.planId);

  function selectStudent(id) {
    f.sid = id;
    const st = student();
    const usable = activePlans();
    f.planId = usable.some((p) => p.id === st.planId) ? st.planId : usable[0]?.id || null;
    f.amount = plan()?.price ?? 0;
    f.months = new Set([baseMonth]);
  }
  if (studentId) selectStudent(studentId);

  const monthOptions = () => [...new Set([-2, -1, 0, 1, 2].map((n) => addMonths(current, n)).concat(baseMonth))].sort();

  function coversMonth(m) {
    const p = plan();
    const cov = analysisFor(f.sid).monthCov.get(m);
    return !!p && !!cov && p.disciplineIds.every((d) => cov.has(d));
  }

  function warnings() {
    const p = plan();
    if (!p) return [];
    const out = [];
    if (p.type === 'mensual') {
      for (const m of [...f.months].sort()) {
        if (!coversMonth(m)) continue;
        const prev = analysisFor(f.sid).monthPays.get(m) || [];
        const who = prev.map((x) => `${find('owners', x.by)?.name || '¿?'} el ${shortDate(x.date)}`).join(', ');
        out.push(`${monthName(m)} ya está pagado (${who}).`);
      }
    } else {
      const b = activeBono(f.sid, f.bonoStart);
      if (b) out.push(`Ya tiene un bono en vigor: le quedan ${b.remaining} días (caduca el ${shortDate(b.end)}).`);
    }
    return out;
  }

  const total = () => (plan()?.type === 'mensual' ? f.amount * f.months.size : f.amount);

  function renderSearch() {
    const q = normalize(f.q);
    const list = getState().students
      .filter((s) => !q || normalize(s.name).includes(q))
      .sort(byName)
      .slice(0, 60);
    return `
      <input type="search" class="search" data-q placeholder="Buscar alumno…" value="${esc(f.q)}" autocomplete="off">
      <div class="list" data-results>${list.map((s) => `
        <div class="row" role="button" tabindex="0" data-pick="${s.id}">
          <span class="grow"><span class="name">${esc(s.name)}</span><span class="sub">${esc(studentGroupsText(s))}</span></span>
          ${s.status === 'baja' ? '<span class="tag">Baja</span>' : ''}
        </div>`).join('') || '<p class="hint">Nadie con ese nombre.</p>'}</div>`;
  }

  function renderForm() {
    const st = student();
    const p = plan();
    const plans = activePlans();
    const owner = currentOwner();
    const warn = warnings();
    const opt = (x) => `<option value="${x.id}" ${x.id === f.planId ? 'selected' : ''}>${esc(x.name)} · ${eur(x.price)}</option>`;
    return `
      <div class="who">
        <div><div class="name">${esc(st.name)}</div><div class="sub">${esc(studentGroupsText(st))}</div></div>
        ${studentId ? '' : '<button type="button" class="btn btn-small" data-act="change">Cambiar</button>'}
      </div>

      <label class="field"><span>Tarifa</span>
        <select data-f="plan">
          <optgroup label="Mensuales">${plans.filter((x) => x.type === 'mensual').map(opt).join('')}</optgroup>
          <optgroup label="Bonos">${plans.filter((x) => x.type === 'bono').map(opt).join('')}</optgroup>
        </select>
      </label>
      ${p ? `<p class="hint">${esc(planSummary(p))}</p>` : '<p class="hint">No hay tarifas activas. Créalas en Ajustes.</p>'}

      ${p?.type === 'mensual' ? `
        <div class="field"><span>Mes que paga</span>
          <div class="chips wrap">${monthOptions().map((m) => `
            <button type="button" class="chip ${f.months.has(m) ? 'on' : ''}" data-month="${m}">
              ${monthShort(m)}${m === current ? ' (actual)' : ''}${coversMonth(m) ? ' ✓' : ''}
            </button>`).join('')}
          </div>
        </div>` : ''}

      ${p?.type === 'bono' ? `
        <label class="field"><span>Empieza el</span><input type="date" data-f="start" value="${f.bonoStart}"></label>
        <p class="hint">${p.sessions} días · caduca el ${shortDate(addDays(f.bonoStart, p.validityDays - 1))}</p>` : ''}

      <label class="field"><span>Importe${p?.type === 'mensual' ? ' por mes' : ''}</span>
        <input type="number" inputmode="decimal" min="0" step="0.5" data-f="amount" value="${f.amount}">
      </label>

      ${p && p.id !== st.planId ? `
        <label class="check-line"><input type="checkbox" data-f="default" ${f.makeDefault ? 'checked' : ''}> Usar esta tarifa por defecto para ${esc(st.name.split(' ')[0])}</label>` : ''}

      ${warn.map((w) => `<p class="warn">⚠️ ${esc(w)}</p>`).join('')}

      <p class="hint">Cobra: <strong>${esc(owner.name)}</strong> · en efectivo</p>
      <button type="button" class="btn btn-primary btn-block" data-act="save" ${p ? '' : 'disabled'}>
        Cobrar <span data-total>${eur(total())}</span>
      </button>`;
  }

  const sheet = openSheet({
    title: 'Cobrar',
    render: () => (f.sid ? renderForm() : renderSearch()),
    bind(body, api) {
      if (!f.sid) {
        const input = body.querySelector('[data-q]');
        setTimeout(() => input.focus(), 50);
        input.oninput = () => {
          f.q = input.value;
          const box = document.createElement('div');
          box.innerHTML = renderSearch();
          body.querySelector('[data-results]').replaceWith(box.querySelector('[data-results]'));
        };
        body.onclick = (e) => {
          const pick = e.target.closest('[data-pick]');
          if (pick) { selectStudent(pick.dataset.pick); api.refresh(); }
        };
        body.onchange = null;
        return;
      }
      body.onclick = (e) => {
        const m = e.target.closest('[data-month]')?.dataset.month;
        if (m) {
          if (f.months.has(m)) f.months.delete(m);
          else f.months.add(m);
          api.refresh();
          return;
        }
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (act === 'change') { f.sid = null; api.refresh(); }
        if (act === 'save') save(api);
      };
      body.onchange = (e) => {
        const key = e.target.dataset.f;
        if (key === 'plan') { f.planId = e.target.value; f.amount = plan()?.price ?? 0; api.refresh(); }
        if (key === 'start' && e.target.value) { f.bonoStart = e.target.value; api.refresh(); }
        if (key === 'default') f.makeDefault = e.target.checked;
      };
      const amount = body.querySelector('[data-f="amount"]');
      if (amount) {
        amount.oninput = () => {
          f.amount = Math.max(0, Number(amount.value) || 0);
          body.querySelector('[data-total]').textContent = eur(total());
        };
      }
    },
  });

  function save(api) {
    const p = plan();
    const st = student();
    if (!p) return;
    if (p.type === 'mensual' && !f.months.size) { toast('Elige al menos un mes'); return; }
    const by = currentOwner().id;
    const base = {
      studentId: st.id,
      planId: p.id,
      planName: p.name,
      type: p.type,
      disciplineIds: [...p.disciplineIds],
      amount: f.amount,
      date: today,
      by,
      voided: false,
      voidReason: '',
      createdAt: Date.now(),
    };
    update((s) => {
      if (p.type === 'mensual') {
        [...f.months].sort().forEach((m) => s.payments.push({ ...base, id: uid('pay'), month: m, startDate: null }));
      } else {
        s.payments.push({ ...base, id: uid('pay'), month: null, startDate: f.bonoStart, sessions: p.sessions, validityDays: p.validityDays });
      }
      const target = s.students.find((x) => x.id === st.id);
      if (f.makeDefault || !target.planId) target.planId = p.id;
      target.status = 'activo';
    });
    api.close();
    toast(`Cobrado ${eur(total())} · ${st.name}`);
  }

  return sheet;
}

export async function voidPayment(paymentId) {
  const p = find('payments', paymentId);
  if (!p || p.voided) return;
  const reason = await promptSheet({
    title: 'Anular cobro',
    label: `Motivo (${p.planName} · ${eur(p.amount)})`,
    placeholder: 'Ej.: apuntado por error',
    confirmLabel: 'Anular cobro',
    danger: true,
  });
  if (reason === null) return;
  update((s) => {
    const x = s.payments.find((y) => y.id === paymentId);
    x.voided = true;
    x.voidReason = reason || 'Sin motivo';
    x.voidedBy = currentOwner().id;
    x.voidedAt = todayISO();
  });
  toast('Cobro anulado');
}
