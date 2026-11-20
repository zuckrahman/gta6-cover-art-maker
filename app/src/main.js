// Vice Coast Cover Maker: wires the editor to the cover engine.
// Photos are read on this machine with FileReader and never uploaded;
// every render is a local canvas draw, and exports are plain PNG blobs.
import { drawCover, panelRectsFor, LAYOUTS, GRADES, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');

export const state = {
  layout: 'hero',
  grade: 'sunset',
  title: 'VICE COAST',
  subtitle: 'Neon nights, salt air, one last score.',
  titleScale: 1,
  grain: true,
  vignette: true,
  frame: true,
  size: '1920x1080',
  photos: [null, null, null],
  photoNames: ['Photo 1', 'Photo 2', 'Photo 3'],
  panels: [
    { photo: 0, zoom: 1, dx: 0, dy: 0 },
    { photo: 1, zoom: 1, dx: 0, dy: 0 },
    { photo: 0, zoom: 1, dx: 0, dy: 0 },
    { photo: 1, zoom: 1, dx: 0, dy: 0 },
  ],
  selectedPanel: 0,
};

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function applySizeToCanvas() {
  const size = SIZES[state.size];
  canvas.width = size.w;
  canvas.height = size.h;
}

export function redraw() {
  applySizeToCanvas();
  drawCover(canvas, state);
  syncPanelControls();
}

function setStatus(text) {
  statusEl.textContent = text;
}

// ---- Photo slots -------------------------------------------------------

function renderPhotoSlots() {
  const wrap = document.getElementById('photo-slots');
  wrap.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'photo-slot' + (photo ? ' loaded' : '');
    slot.textContent = photo ? state.photoNames[i] : `Empty slot ${i + 1}`;
    if (photo) slot.style.backgroundImage = `url(${photo.src})`;
    slot.title = photo ? `${state.photoNames[i]} — click to put it in the selected panel` : 'Empty slot';
    slot.addEventListener('click', () => {
      if (!photo) return;
      state.panels[state.selectedPanel].photo = i;
      redraw();
      setStatus(`${state.photoNames[i]} is now in panel ${state.selectedPanel + 1}.`);
    });
    wrap.appendChild(slot);
  });
}

async function loadSample(name, slot) {
  const img = await loadImage(`samples/${name}.jpg`);
  state.photos[slot] = img;
  state.photoNames[slot] = name === 'boulevard' ? 'Boulevard sample' : 'Pier sample';
  renderPhotoSlots();
  redraw();
}

document.getElementById('photo-files').addEventListener('change', async (e) => {
  const files = [...e.target.files].slice(0, 3);
  for (const file of files) {
    const slot = state.photos.findIndex((p) => p === null);
    if (slot === -1) break;
    const dataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    state.photos[slot] = await loadImage(dataUrl);
    state.photoNames[slot] = file.name;
  }
  renderPhotoSlots();
  redraw();
  setStatus('Photos loaded. They stay on this machine.');
});

document.querySelectorAll('[data-sample]').forEach((button) => {
  button.addEventListener('click', async () => {
    const slot = state.photos.findIndex((p) => p === null);
    const target = slot === -1 ? 0 : slot;
    await loadSample(button.dataset.sample, target);
    setStatus(`Sample photo loaded into slot ${target + 1}.`);
  });
});

// ---- Layout and grade buttons ------------------------------------------

function buildChoiceButtons(containerId, entries, current, onPick) {
  const wrap = document.getElementById(containerId);
  wrap.innerHTML = '';
  for (const [key, entry] of Object.entries(entries)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = entry.label;
    if (key === current) button.classList.add('active');
    button.addEventListener('click', () => {
      onPick(key);
      wrap.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      button.classList.add('active');
    });
    wrap.appendChild(button);
  }
}

/** Rebuilds the layout, grade and size controls from the current state. */
export function syncChoiceControls() {
  buildChoiceButtons('layout-grid', LAYOUTS, state.layout, (key) => {
    state.layout = key;
    const count = LAYOUTS[key].panels;
    state.selectedPanel = Math.min(state.selectedPanel, count - 1);
    redraw();
  });
  buildChoiceButtons('grade-grid', GRADES, state.grade, (key) => {
    state.grade = key;
    redraw();
  });
  document.getElementById('size').value = state.size;
}

buildChoiceButtons('layout-grid', LAYOUTS, state.layout, (key) => {
  state.layout = key;
  const count = LAYOUTS[key].panels;
  state.selectedPanel = Math.min(state.selectedPanel, count - 1);
  redraw();
});
buildChoiceButtons('grade-grid', GRADES, state.grade, (key) => {
  state.grade = key;
  redraw();
});

// ---- Selected panel controls -------------------------------------------

const panelPhoto = document.getElementById('panel-photo');
const panelZoom = document.getElementById('panel-zoom');
const panelDx = document.getElementById('panel-dx');
const panelDy = document.getElementById('panel-dy');

function currentPanel() {
  return state.panels[state.selectedPanel];
}

function syncPanelControls() {
  const panel = currentPanel();
  document.getElementById('selected-panel-label').textContent =
    `Selected panel: ${state.selectedPanel + 1} of ${LAYOUTS[state.layout].panels} — click another panel in the preview to switch.`;
  panelPhoto.value = String(panel.photo);
  panelZoom.value = String(panel.zoom);
  panelDx.value = String(panel.dx);
  panelDy.value = String(panel.dy);
  document.getElementById('zoom-value').textContent = `${panel.zoom.toFixed(2)}x`;
  document.getElementById('dx-value').textContent = panel.dx.toFixed(2);
  document.getElementById('dy-value').textContent = panel.dy.toFixed(2);
  document.getElementById('title-scale-value').textContent = `${Math.round(state.titleScale * 100)}%`;
}

panelPhoto.addEventListener('change', () => {
  currentPanel().photo = Number(panelPhoto.value);
  redraw();
});
panelZoom.addEventListener('input', () => {
  currentPanel().zoom = Number(panelZoom.value);
  redraw();
});
panelDx.addEventListener('input', () => {
  currentPanel().dx = Number(panelDx.value);
  redraw();
});
panelDy.addEventListener('input', () => {
  currentPanel().dy = Number(panelDy.value);
  redraw();
});

document.getElementById('fill-all').addEventListener('click', () => {
  const photo = currentPanel().photo;
  state.panels.forEach((panel) => { panel.photo = photo; });
  redraw();
  setStatus(`Every panel now shows ${state.photoNames[photo]}.`);
});
document.getElementById('reset-panel').addEventListener('click', () => {
  state.panels[state.selectedPanel] = { photo: 0, zoom: 1, dx: 0, dy: 0 };
  redraw();
});

// ---- Caption and effects -----------------------------------------------

document.getElementById('title').addEventListener('input', (e) => {
  state.title = e.target.value;
  redraw();
});
document.getElementById('subtitle').addEventListener('input', (e) => {
  state.subtitle = e.target.value;
  redraw();
});
document.getElementById('title-scale').addEventListener('input', (e) => {
  state.titleScale = Number(e.target.value);
  redraw();
});
document.getElementById('grain').addEventListener('change', (e) => {
  state.grain = e.target.checked;
  redraw();
});
document.getElementById('vignette').addEventListener('change', (e) => {
  state.vignette = e.target.checked;
  redraw();
});
document.getElementById('frame').addEventListener('change', (e) => {
  state.frame = e.target.checked;
  redraw();
});
document.getElementById('size').addEventListener('change', (e) => {
  state.size = e.target.value;
  redraw();
});

// ---- Click and drag on the preview -------------------------------------

function panelAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const px = ((clientX - rect.left) / rect.width) * canvas.width;
  const py = ((clientY - rect.top) / rect.height) * canvas.height;
  const rects = panelRectsFor(state.layout, canvas.width, canvas.height);
  for (let i = rects.length - 1; i >= 0; i -= 1) {
    const r = rects[i];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const hit = panelAt(e.clientX, e.clientY);
  if (hit === -1) return;
  state.selectedPanel = hit;
  drag = { x: e.clientX, y: e.clientY, dx: currentPanel().dx, dy: currentPanel().dy };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const panelRect = panelRectsFor(state.layout, canvas.width, canvas.height)[state.selectedPanel];
  const panel = currentPanel();
  const movedX = ((e.clientX - drag.x) / rect.width) * canvas.width;
  const movedY = ((e.clientY - drag.y) / rect.height) * canvas.height;
  panel.dx = Math.max(-1, Math.min(1, drag.dx + (movedX / panelRect.w) * 2));
  panel.dy = Math.max(-1, Math.min(1, drag.dy + (movedY / panelRect.h) * 2));
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

// ---- Export ------------------------------------------------------------

export function exportCover(sizeKey) {
  const size = SIZES[sizeKey];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  drawCover(off, state);
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vice-coast-cover-${sizeKey}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatus(`Saved vice-coast-cover-${sizeKey}.png (${size.w} x ${size.h}).`);
      resolve(blob);
    }, 'image/png');
  });
}

document.getElementById('export').addEventListener('click', () => exportCover(state.size));
document.querySelectorAll('[data-export-size]').forEach((button) => {
  button.addEventListener('click', () => exportCover(button.dataset.exportSize));
});

// ---- Startup -----------------------------------------------------------

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runShot(shot, params, state, { loadSample, redraw, exportCover, syncChoiceControls });
} else {
  renderPhotoSlots();
  loadSample('boulevard', 0).then(() => loadSample('pier', 1));
  document.fonts.ready.then(() => redraw());
  redraw();
}
