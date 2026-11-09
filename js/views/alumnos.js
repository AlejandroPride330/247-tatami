// Pestaña "Alumnos": listado, ficha y alta/edición.
// El alta recoge nombre, apellidos, teléfono y foto (hecha con la tablet), y la autorización
// de protección de datos con la firma del alumno o de su tutor.
import { getState, update, find } from '../store.js';
import { analysisFor, monthStatus, activeBono, activeDisciplines, activeGroups, activePlans, studentGroupsText, groupLabel } from '../logic.js';
import { esc, eur, todayISO, monthOf, addMonths, monthShort, monthLabel, dayLabel, shortDate, normalize, byName, uid } from '../util.js';
import { openSheet, toast, badge, empty, avatar, requestRender } from '../ui.js';
import { takePhoto, signaturePad } from '../media.js';
import { consentText, CONSENT_VERSION } from '../privacy.js';
import { openCobrar, voidPayment } from './cobrar.js';

const ui = { q: '', filter: 'activo' };

const fullName = (f) => [f.firstName, f.lastName1, f.lastName2].map((x) => String(x || '').trim()).filter(Boolean).join(' ');
const signedLabel = (c) => new Date(c.signedAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function filtered() {
  const q = normalize(ui.q);
  return getState().students
    .filter((s) => ui.filter === 'todos' || (ui.filter === 'firma' ? !s.consent : s.status === ui.filter))
    .filter((s) => !q || normalize(s.name).includes(q))
    .sort(byName);
}

function listHTML() {
  const month = monthOf(todayISO());
  const rows = filtered().map((s) => `
    <div class="row" role="button" tabindex="0" data-sid="${s.id}">
      ${avatar(s)}
      <span class="grow"><span class="name">${esc(s.name)}</span><span class="sub">${esc(studentGroupsText(s))}</span></span>
      ${s.status === 'baja' ? '<span class="tag">Baja</span>' : badge(monthStatus(s.id, month))}
    </div>`).join('');
  return rows || empty('No hay alumnos aquí', ui.q ? 'Prueba con otro nombre.' : '');
}

export function render() {
  const all = getState().students;
  const count = (st) => all.filter((s) => st === 'todos' || (st === 'firma' ? !s.consent : s.status === st)).length;
  const seg = (id, label) => `<button type="button" class="seg-btn ${ui.filter === id ? 'on' : ''}" data-filter="${id}">${label} <small>${count(id)}</small></button>`;
  return `
    <div class="search-row">
      <input type="search" class="search" data-q placeholder="Buscar alumno…" value="${esc(ui.q)}" autocomplete="off">
      <button type="button" class="btn btn-primary" data-act="new">+ Nuevo alumno</button>
    </div>
    <div class="seg">${seg('activo', 'Activos')}${seg('baja', 'Bajas')}${seg('todos', 'Todos')}${count('firma') ? seg('firma', 'Sin firma de datos') : ''}</div>
    ${ui.filter === 'firma' ? '<p class="hint">Alumnos que aún no han firmado la autorización de protección de datos. Abre su ficha y pulsa «Firmar ahora».</p>' : ''}
    <div class="list" data-list>${listHTML()}</div>`;
}

export function bind(root) {
  root.onchange = null;
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
        <div class="ficha-head">
          ${avatar(st, 'avatar-xl')}
          <div class="ficha-top">
            ${st.status === 'baja' ? '<span class="tag">Baja</span>' : badge(ms)}
            <span class="sub">${esc(studentGroupsText(st))}</span>
            ${st.phone ? `<a class="sub phone" href="tel:${esc(st.phone.replace(/[^\d+]/g, ''))}">📞 ${esc(st.phone)}</a>` : ''}
          </div>
        </div>
        ${st.consent
          ? `<div class="consent-ok"><span>🛡️ Protección de datos firmada el ${esc(signedLabel(st.consent))}</span>
              <button type="button" class="btn btn-small btn-ghost" data-act="consent">Ver</button></div>`
          : `<div class="warn consent-missing"><span>⚠️ Falta la autorización de protección de datos.</span>
              <button type="button" class="btn btn-small" data-act="edit">Firmar ahora</button></div>`}
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
              <span class="sub">${shortDate(p.date)}${p.voided ? ` · Anulado: ${esc(p.voidReason)}` : ''}</span>
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
        if (act === 'consent') openConsent(studentId);
      };
    },
  });
  return sheet;
}

// El documento firmado: el texto tal y como se aceptó, la firma y la fecha.
function openConsent(studentId) {
  const st = find('students', studentId);
  const c = st?.consent;
  if (!c) return;
  openSheet({
    title: 'Autorización de protección de datos',
    render: () => `
      <div class="consent-doc">
        ${c.text.map((p) => `<p>${esc(p)}</p>`).join('')}
      </div>
      <div class="card">
        <div class="line"><span>Alumno</span><strong>${esc(st.name)}</strong></div>
        <div class="line"><span>Firma</span><strong>${c.signer === 'tutor' ? `${esc(c.signerName)} (tutor legal)` : 'El propio alumno'}</strong></div>
        <div class="line"><span>Fecha</span><strong>${esc(signedLabel(c))}</strong></div>
        <img class="signature-img" src="${esc(c.signature)}" alt="Firma">
      </div>`,
  });
}

// --- Alta y edición ---

export function openEditStudent(studentId = null, { presetGroupId = null, presetName = '', onSaved } = {}) {
  const existing = studentId ? find('students', studentId) : null;
  const [pFirst = '', ...pRest] = presetName.trim().split(/\s+/);
  const f = existing
    ? {
      firstName: existing.firstName ?? existing.name, lastName1: existing.lastName1 || '', lastName2: existing.lastName2 || '',
      phone: existing.phone || '', photo: existing.photo || null,
      groupIds: new Set(existing.groupIds), planId: existing.planId || '', status: existing.status, notes: existing.notes || '',
    }
    : {
      firstName: pFirst, lastName1: pRest[0] || '', lastName2: pRest.slice(1).join(' '),
      phone: '', photo: null, groupIds: new Set(presetGroupId ? [presetGroupId] : []), planId: '', status: 'activo', notes: '',
    };
  // Autorización: se firma una vez. Si ya está firmada no se vuelve a pedir.
  const signed = existing?.consent || null;
  const c = { accepted: false, signer: 'alumno', signerName: '', signature: null };
  let pad = null;

  const readInputs = (body) => {
    body.querySelectorAll('[data-f]').forEach((el) => { f[el.dataset.f] = el.value; });
    const sn = body.querySelector('[data-c="signerName"]');
    if (sn) c.signerName = sn.value;
    const ok = body.querySelector('[data-c="accepted"]');
    if (ok) c.accepted = ok.checked;
  };
  const textNow = () => consentText({ studentName: fullName(f), signer: c.signer, signerName: c.signerName });

  function consentHTML() {
    if (signed) {
      return `
        <div class="consent-ok"><span>🛡️ Autorización firmada el ${esc(signedLabel(signed))}${signed.signer === 'tutor' ? ` por ${esc(signed.signerName)}` : ''}</span></div>`;
    }
    return `
      <div class="field"><span>¿Quién firma?</span>
        <div class="seg">
          <button type="button" class="seg-btn ${c.signer === 'alumno' ? 'on' : ''}" data-signer="alumno">El alumno</button>
          <button type="button" class="seg-btn ${c.signer === 'tutor' ? 'on' : ''}" data-signer="tutor">Padre, madre o tutor</button>
        </div>
        <span class="hint">Si el alumno tiene menos de 14 años, firma su padre, madre o tutor legal.</span>
      </div>
      ${c.signer === 'tutor' ? `<label class="field"><span>Nombre y apellidos del padre, madre o tutor</span><input type="text" data-c="signerName" value="${esc(c.signerName)}" autocomplete="off"></label>` : ''}
      <div class="consent-doc" data-consent-text>${textNow().map((p) => `<p>${esc(p)}</p>`).join('')}</div>
      <label class="check-line consent-check"><input type="checkbox" data-c="accepted" ${c.accepted ? 'checked' : ''}>
        <span>He leído la información anterior y <strong>autorizo</strong> el tratamiento de ${c.signer === 'tutor' ? 'los datos personales del alumno' : 'mis datos personales'}.</span></label>
      <div class="field"><span>Firma${c.signer === 'tutor' ? ' del padre, madre o tutor' : ' del alumno'}</span>
        <div class="sign-box">
          <canvas class="sign-pad" data-sign aria-label="Zona para firmar con el dedo"></canvas>
          <span class="sign-line" aria-hidden="true">Firme aquí con el dedo · ${shortDate(todayISO())}/${todayISO().slice(0, 4)}</span>
          <button type="button" class="btn btn-small sign-clear" data-act="clear-sign">Borrar firma</button>
        </div>
      </div>`;
  }

  openSheet({
    title: existing ? 'Editar alumno' : 'Nuevo alumno',
    render: () => {
      const groups = activeGroups();
      const plans = activePlans();
      // Si tiene una clase archivada, la seguimos mostrando para no perderla al guardar.
      const extra = [...f.groupIds].map((id) => find('groups', id)).filter((g) => g && !groups.includes(g));
      return `
        <h3 class="section-title">Datos personales</h3>
        <div class="alta-top">
          <button type="button" class="photo-btn ${f.photo ? 'has' : ''}" data-act="photo" aria-label="${f.photo ? 'Repetir la foto' : 'Hacer la foto'}">
            ${f.photo ? `<img src="${esc(f.photo)}" alt="Foto del alumno">` : '<span class="photo-ph"><span aria-hidden="true">📷</span>Hacer foto</span>'}
            ${f.photo ? '<span class="photo-redo">Repetir</span>' : ''}
          </button>
          <div class="alta-fields">
            <label class="field"><span>Nombre</span><input type="text" data-f="firstName" value="${esc(f.firstName)}" autocomplete="off" autocapitalize="words"></label>
            <div class="two">
              <label class="field"><span>Primer apellido</span><input type="text" data-f="lastName1" value="${esc(f.lastName1)}" autocomplete="off" autocapitalize="words"></label>
              <label class="field"><span>Segundo apellido</span><input type="text" data-f="lastName2" value="${esc(f.lastName2)}" autocomplete="off" autocapitalize="words"></label>
            </div>
            <label class="field"><span>Teléfono</span><input type="tel" data-f="phone" value="${esc(f.phone)}" inputmode="tel" autocomplete="off" placeholder="600 000 000"></label>
          </div>
        </div>

        <h3 class="section-title">Clases y tarifa</h3>
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
        ${existing ? `
        <div class="field"><span>Situación</span>
          <div class="seg">
            <button type="button" class="seg-btn ${f.status === 'activo' ? 'on' : ''}" data-status="activo">Activo</button>
            <button type="button" class="seg-btn ${f.status === 'baja' ? 'on' : ''}" data-status="baja">Baja</button>
          </div>
          <span class="hint">Las bajas no salen al pasar lista. Si vuelve, al marcarle vuelve a estar activo.</span>
        </div>` : ''}
        <label class="field"><span>Notas (opcional)</span><textarea data-f="notes" rows="2" placeholder="Ej.: paga su madre">${esc(f.notes)}</textarea></label>

        <h3 class="section-title">Protección de datos</h3>
        ${consentHTML()}

        <button type="button" class="btn btn-primary btn-block" data-act="save">${existing ? 'Guardar cambios' : 'Dar de alta'}</button>`;
    },
    bind(body, api) {
      if (!existing && !f.firstName) setTimeout(() => body.querySelector('[data-f="firstName"]')?.focus(), 50);
      const canvas = body.querySelector('[data-sign]');
      pad = canvas ? signaturePad(canvas, { initial: c.signature, onChange: (data) => { c.signature = data; } }) : null;

      // El nombre del texto legal se actualiza mientras se escribe.
      body.oninput = (e) => {
        if (!e.target.matches('[data-f^="firstName"],[data-f^="lastName"],[data-c="signerName"]')) return;
        readInputs(body);
        const box = body.querySelector('[data-consent-text]');
        if (box) box.innerHTML = textNow().map((p) => `<p>${esc(p)}</p>`).join('');
      };
      body.onclick = async (e) => {
        const gid = e.target.closest('[data-gid]')?.dataset.gid;
        const status = e.target.closest('[data-status]')?.dataset.status;
        const signer = e.target.closest('[data-signer]')?.dataset.signer;
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (gid || status || signer) {
          readInputs(body);
          if (gid) { if (f.groupIds.has(gid)) f.groupIds.delete(gid); else f.groupIds.add(gid); }
          if (status) f.status = status;
          // Si cambia quién firma, la firma anterior ya no vale.
          if (signer && signer !== c.signer) { c.signer = signer; c.signature = null; c.accepted = false; }
          api.refresh();
          return;
        }
        if (act === 'clear-sign') { pad?.clear(); return; }
        if (act === 'photo') {
          readInputs(body);
          const photo = await takePhoto();
          if (photo) { f.photo = photo; api.refresh(); }
          return;
        }
        if (act === 'save') save(body, api);
      };
    },
  });

  function save(body, api) {
    readInputs(body);
    const firstName = f.firstName.trim();
    const lastName1 = f.lastName1.trim();
    const phone = f.phone.trim();
    if (!firstName) { toast('Escribe el nombre'); return; }
    if (!lastName1) { toast('Escribe el primer apellido'); return; }
    if (phone.replace(/\D/g, '').length < 9) { toast('Escribe un teléfono válido'); return; }

    // Para las altas nuevas la autorización es obligatoria. En alumnos antiguos se puede
    // guardar sin ella (sale el aviso en su ficha), pero si se empieza a firmar, debe completarse.
    let consent = signed;
    const started = c.accepted || c.signature;
    if (!signed && (!existing || started)) {
      if (c.signer === 'tutor' && !c.signerName.trim()) { toast('Escribe el nombre del padre, madre o tutor'); return; }
      if (!c.accepted) { toast('Falta marcar la casilla de autorización'); return; }
      if (!c.signature) { toast('Falta la firma'); return; }
      consent = {
        version: CONSENT_VERSION,
        signedAt: new Date().toISOString(),
        signer: c.signer,
        signerName: c.signer === 'tutor' ? c.signerName.trim() : fullName(f),
        text: textNow(),
        signature: c.signature,
      };
    }

    const data = {
      name: fullName(f), firstName, lastName1, lastName2: f.lastName2.trim(), phone, photo: f.photo,
      groupIds: [...f.groupIds], planId: f.planId || null, status: f.status, notes: f.notes.trim(), consent,
    };
    let id = studentId;
    update((s) => {
      if (existing) Object.assign(s.students.find((x) => x.id === studentId), data);
      else { id = uid('stu'); s.students.push({ id, ...data, createdAt: todayISO() }); }
    });
    api.close();
    toast(existing ? 'Cambios guardados' : `${data.name} dado de alta`);
    onSaved?.(id);
  }
}
