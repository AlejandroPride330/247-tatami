// Arranque: carga datos, pinta la pestaña activa y la cabecera.
import { load, getState, subscribe, update, currentOwner } from './store.js';
import { esc } from './util.js';
import { openSheet, setRenderer, toast } from './ui.js';
import * as lista from './views/lista.js';
import * as cobros from './views/cobros.js';
import * as alumnos from './views/alumnos.js';
import * as caja from './views/caja.js';
import * as ajustes from './views/ajustes.js';

const icon = (paths) => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
const TABS = [
  { id: 'lista', label: 'Lista', view: lista, icon: icon('<rect x="3.5" y="3.5" width="17" height="17" rx="3.5"/><path d="M8 12.2l2.8 2.8L16.2 9"/>') },
  { id: 'cobros', label: 'Cobros', view: cobros, icon: icon('<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.8"/><path d="M6 10v4M18 10v4"/>') },
  { id: 'alumnos', label: 'Alumnos', view: alumnos, icon: icon('<circle cx="9" cy="8" r="3.4"/><path d="M2.8 20c.8-3.5 3.3-5.4 6.2-5.4s5.4 1.9 6.2 5.4"/><path d="M15.5 4.8a3.4 3.4 0 0 1 0 6.4M17.6 14.9c1.9.7 3.1 2.4 3.6 5.1"/>') },
  { id: 'caja', label: 'Caja', view: caja, icon: icon('<path d="M3 20.5h18M6.5 17v-5M11.5 17V6M16.5 17v-8"/>') },
  { id: 'ajustes', label: 'Ajustes', view: ajustes, icon: icon('<path d="M4 6.5h9M17 6.5h3M4 12h3M11 12h9M4 17.5h11M19 17.5h1"/><circle cx="15" cy="6.5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17.5" r="2"/>') },
];

const main = document.getElementById('main');
const nav = document.getElementById('tabbar');
const gymName = document.getElementById('gym-name');
const ownerBtn = document.getElementById('owner-btn');

let tab = null;

function currentTab() {
  const id = location.hash.slice(1);
  return TABS.find((t) => t.id === id) || TABS[0];
}

function render() {
  const next = currentTab();
  const sameTab = next === tab;
  const y = window.scrollY;
  tab = next;
  main.innerHTML = tab.view.render();
  tab.view.bind(main);
  window.scrollTo(0, sameTab ? y : 0);

  gymName.textContent = getState().gymName;
  ownerBtn.innerHTML = `<span aria-hidden="true">👤</span> ${esc(currentOwner().name)}`;
  nav.innerHTML = TABS.map((t) => `
    <a href="#${t.id}" class="tab ${t === tab ? 'on' : ''}" ${t === tab ? 'aria-current="page"' : ''}>${t.icon}<span>${t.label}</span></a>`).join('');
}

function chooseOwner() {
  const sheet = openSheet({
    title: '¿Quién está usando el móvil?',
    render: () => `
      <p class="hint">Los cobros y las listas quedan firmados con este nombre.</p>
      <div class="list">${getState().owners.map((o) => `
        <div class="row" role="button" tabindex="0" data-owner="${o.id}">
          <span class="grow name">${esc(o.name)}</span>${o.id === getState().currentOwnerId ? '<span class="tag tag-ok">Ahora</span>' : ''}
        </div>`).join('')}
      </div>
      <p class="hint">En la versión final cada socio entrará con su propia cuenta.</p>`,
    bind(body) {
      body.onclick = (e) => {
        const id = e.target.closest('[data-owner]')?.dataset.owner;
        if (!id) return;
        update((s) => { s.currentOwnerId = id; });
        sheet.close();
        toast(`Hola, ${currentOwner().name}`);
      };
    },
  });
}

load();
setRenderer(render);
subscribe(render);
window.addEventListener('hashchange', render);
ownerBtn.addEventListener('click', chooseOwner);
render();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
