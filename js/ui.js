// Piezas de interfaz compartidas: hojas deslizantes, avisos y etiquetas.
import { subscribe } from './store.js';
import { esc } from './util.js';

let renderer = () => {};
export const setRenderer = (fn) => { renderer = fn; };
export const requestRender = () => renderer();

const stack = [];

// Hoja inferior. `render` devuelve HTML; `bind` engancha eventos (usar body.onclick = ...).
// Con `live`, se vuelve a pintar cada vez que cambian los datos.
export function openSheet({ title, render, bind, live = false, onClose }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  backdrop.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="sheet-head">
        <h2 class="sheet-title">${esc(title)}</h2>
        <button type="button" class="icon-btn" data-close aria-label="Cerrar">✕</button>
      </div>
      <div class="sheet-body"></div>
    </div>`;
  document.getElementById('sheet-root').appendChild(backdrop);
  const body = backdrop.querySelector('.sheet-body');
  let unsubscribe = null;

  const api = {
    body,
    refresh() {
      const top = body.scrollTop;
      body.innerHTML = render(api);
      bind?.(body, api);
      body.scrollTop = top;
    },
    close() {
      if (!backdrop.isConnected) return;
      unsubscribe?.();
      backdrop.remove();
      stack.splice(stack.indexOf(api), 1);
      document.body.classList.toggle('modal-open', stack.length > 0);
      onClose?.();
    },
    setTitle(t) {
      backdrop.querySelector('.sheet-title').textContent = t;
    },
  };

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop || e.target.closest('[data-close]')) api.close();
  });
  stack.push(api);
  document.body.classList.add('modal-open');
  api.refresh();
  if (live) unsubscribe = subscribe(() => api.refresh());
  requestAnimationFrame(() => backdrop.classList.add('open'));
  return api;
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && stack.length) stack[stack.length - 1].close();
  // Filas con role="button": que respondan también al teclado.
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('[role="button"]')) {
    e.preventDefault();
    e.target.click();
  }
});

export function confirmSheet({ title, message, confirmLabel = 'Confirmar', danger = false }) {
  return new Promise((resolve) => {
    let answered = false;
    const sheet = openSheet({
      title,
      render: () => `
        <p class="lead">${esc(message)}</p>
        <div class="btn-row">
          <button type="button" class="btn" data-close>Cancelar</button>
          <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(confirmLabel)}</button>
        </div>`,
      bind(body) {
        body.querySelector('[data-ok]').onclick = () => { answered = true; sheet.close(); resolve(true); };
      },
      onClose: () => { if (!answered) resolve(false); },
    });
  });
}

export function promptSheet({ title, label, placeholder = '', confirmLabel = 'Aceptar', danger = false }) {
  return new Promise((resolve) => {
    let answered = false;
    const sheet = openSheet({
      title,
      render: () => `
        <label class="field"><span>${esc(label)}</span>
          <input type="text" data-input placeholder="${esc(placeholder)}" autocomplete="off">
        </label>
        <div class="btn-row">
          <button type="button" class="btn" data-close>Cancelar</button>
          <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(confirmLabel)}</button>
        </div>`,
      bind(body) {
        const input = body.querySelector('[data-input]');
        setTimeout(() => input.focus(), 50);
        body.querySelector('[data-ok]').onclick = () => {
          answered = true;
          sheet.close();
          resolve(input.value.trim());
        };
      },
      onClose: () => { if (!answered) resolve(null); },
    });
  });
}

let toastTimer = null;
export function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

export const badge = (ms) => `<span class="badge b-${ms.code}">${esc(ms.label)}</span>`;

export const dot = (color) => `<span class="dot" style="background:${esc(color)}"></span>`;

export const empty = (title, text = '') =>
  `<div class="empty"><p class="empty-title">${esc(title)}</p>${text ? `<p>${esc(text)}</p>` : ''}</div>`;

export function monthNav(label, { canNext = true } = {}) {
  return `
    <div class="toolbar">
      <button type="button" class="icon-btn" data-act="prev-month" aria-label="Mes anterior">‹</button>
      <span class="toolbar-title">${esc(label)}</span>
      <button type="button" class="icon-btn" data-act="next-month" aria-label="Mes siguiente" ${canNext ? '' : 'disabled'}>›</button>
    </div>`;
}

// Miniatura del alumno: su foto o, si aún no tiene, sus iniciales.
export function avatar(st, cls = '') {
  if (st?.photo && /^data:image\/(jpeg|png|webp);base64,/.test(st.photo)) {
    return `<img class="avatar ${cls}" src="${esc(st.photo)}" alt="" loading="lazy" decoding="async">`;
  }
  const first = st?.firstName || st?.name || '?';
  const initials = `${first[0] || ''}${st?.lastName1?.[0] || ''}`.toUpperCase();
  return `<span class="avatar avatar-ph ${cls}" aria-hidden="true">${esc(initials)}</span>`;
}
