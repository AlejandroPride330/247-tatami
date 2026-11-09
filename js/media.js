// Cámara para la foto del alumno y panel de firma.
// Las imágenes se guardan pequeñas (JPEG) porque en la demo todo vive en la memoria de la tablet.
import { openSheet, toast } from './ui.js';

const PHOTO_SIZE = 240; // px, cuadrada
const SIGN_WIDTH = 520; // px de ancho al guardar la firma

// Recorta al centro en cuadrado y reduce. `source` puede ser <video>, <img> o ImageBitmap.
function squareJPEG(source, w, h) {
  const side = Math.min(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = PHOTO_SIZE;
  canvas.height = PHOTO_SIZE;
  canvas.getContext('2d').drawImage(source, (w - side) / 2, (h - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
  return canvas.toDataURL('image/jpeg', 0.78);
}

function fileToPhoto(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(squareJPEG(img, img.naturalWidth, img.naturalHeight)); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagen')); };
    img.src = url;
  });
}

// Abre la cámara de la tablet dentro de la app. Devuelve la foto (data URL) o null si se cancela.
// Si el navegador no deja usar la cámara en directo, ofrece la cámara del sistema.
export function takePhoto() {
  return new Promise((resolve) => {
    let stream = null;
    let facing = 'user';
    let shot = null;
    let error = '';
    let done = false;

    const stop = () => { stream?.getTracks().forEach((t) => t.stop()); stream = null; };
    const finish = (value) => { done = true; stop(); sheet.close(); resolve(value); };

    async function start(api) {
      stop();
      if (!navigator.mediaDevices?.getUserMedia) { error = 'Este navegador no deja usar la cámara dentro de la app.'; api.refresh(); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
        if (done) { stop(); return; }
        const video = api.body.querySelector('video');
        if (video) { video.srcObject = stream; await video.play().catch(() => {}); }
      } catch (e) {
        error = e?.name === 'NotAllowedError'
          ? 'No hay permiso para usar la cámara. Actívalo en el navegador o usa la cámara del sistema.'
          : 'No se ha podido abrir la cámara.';
        api.refresh();
      }
    }

    const sheet = openSheet({
      title: 'Foto del alumno',
      render: () => {
        if (shot) {
          return `
            <div class="cam"><img src="${shot}" alt="Foto tomada" class="cam-shot"></div>
            <div class="btn-row">
              <button type="button" class="btn" data-act="retry">Repetir</button>
              <button type="button" class="btn btn-primary" data-act="use">Usar esta foto</button>
            </div>`;
        }
        if (error) {
          return `
            <p class="warn">${error}</p>
            <label class="btn btn-primary btn-block">Abrir la cámara del sistema
              <input type="file" accept="image/*" capture="user" data-file hidden>
            </label>`;
        }
        return `
          <div class="cam">
            <video autoplay playsinline muted class="${facing === 'user' ? 'mirror' : ''}"></video>
            <span class="cam-frame" aria-hidden="true"></span>
          </div>
          <p class="hint">Que la cara quede dentro del círculo.</p>
          <div class="btn-row">
            <button type="button" class="btn" data-act="flip">Cambiar cámara</button>
            <button type="button" class="btn btn-primary" data-act="snap">📸 Hacer foto</button>
          </div>`;
      },
      bind(body, api) {
        body.onclick = (e) => {
          const act = e.target.closest('[data-act]')?.dataset.act;
          if (act === 'snap') {
            const video = body.querySelector('video');
            if (!video?.videoWidth) { toast('La cámara aún no está lista'); return; }
            // Se guarda sin efecto espejo, tal y como la vería otra persona.
            shot = squareJPEG(video, video.videoWidth, video.videoHeight);
            stop();
            api.refresh();
          }
          if (act === 'flip') { facing = facing === 'user' ? 'environment' : 'user'; api.refresh(); start(api); }
          if (act === 'retry') { shot = null; api.refresh(); start(api); }
          if (act === 'use') finish(shot);
        };
        body.onchange = async (e) => {
          const file = e.target.matches('[data-file]') && e.target.files[0];
          if (!file) return;
          try { shot = await fileToPhoto(file); error = ''; api.refresh(); } catch { toast('No se ha podido leer la foto'); }
        };
      },
      onClose: () => { stop(); if (!done) { done = true; resolve(null); } },
    });
    start(sheet);
  });
}

// Panel de firma sobre un <canvas>. Fondo blanco siempre (como un papel), también en modo oscuro.
// Devuelve { clear(), isEmpty(), toDataURL() }. `initial` es una firma previa para volver a pintarla.
export function signaturePad(canvas, { initial = null, onChange } = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  let empty = true;
  let last = null;

  function size() {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2.6 * dpr;
  }
  size();
  if (initial) {
    const img = new Image();
    img.onload = () => { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); };
    img.src = initial;
    empty = false;
  }

  const point = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * dpr, y: (e.clientY - r.top) * dpr };
  };
  canvas.onpointerdown = (e) => {
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch { /* sin captura también funciona */ }
    last = point(e);
    ctx.beginPath();
    ctx.arc(last.x, last.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  };
  canvas.onpointermove = (e) => {
    if (!last) return;
    e.preventDefault();
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
    empty = false;
  };
  const end = () => {
    if (!last) return;
    last = null;
    empty = false;
    saved = pad.toDataURL();
    onChange?.(saved);
  };
  canvas.onpointerup = end;
  canvas.onpointercancel = end;

  // Si la tablet gira, el lienzo cambia de tamaño: se vuelve a pintar la firma guardada.
  let saved = initial;
  let width = canvas.getBoundingClientRect().width;
  new ResizeObserver(() => {
    const w = canvas.getBoundingClientRect().width;
    if (!w || Math.abs(w - width) < 1) return;
    width = w;
    size();
    if (saved && !empty) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = saved;
    }
  }).observe(canvas);

  const pad = {
    clear() { size(); empty = true; saved = null; onChange?.(null); },
    isEmpty: () => empty,
    toDataURL() {
      if (empty) return null;
      const out = document.createElement('canvas');
      out.width = SIGN_WIDTH;
      out.height = Math.round((SIGN_WIDTH * canvas.height) / canvas.width);
      const o = out.getContext('2d');
      o.fillStyle = '#fff';
      o.fillRect(0, 0, out.width, out.height);
      o.drawImage(canvas, 0, 0, out.width, out.height);
      return out.toDataURL('image/jpeg', 0.7);
    },
  };
  return pad;
}
