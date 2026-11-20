// Fixed scenes for screenshots: ?shot=cover shows the exported cover alone,
// ?shot=editor shows the editor with a sample photo loaded, and ?shot=export
// renders the PNG export path and exposes its data URL for testing.
// Query keys: photo (boulevard|pier), title, subtitle, layout, grade, size.
// window.__shotReady is set once the scene is painted.
import { LAYOUTS, GRADES, SIZES } from './cover.js';

export async function runShot(shot, query, state, helpers) {
  const { loadSample, redraw, exportCover, syncChoiceControls } = helpers;
  if (query.get('layout') && LAYOUTS[query.get('layout')]) state.layout = query.get('layout');
  if (query.get('grade') && GRADES[query.get('grade')]) state.grade = query.get('grade');
  if (query.get('size') && SIZES[query.get('size')]) state.size = query.get('size');
  if (query.get('title') !== null) {
    state.title = query.get('title');
    document.getElementById('title').value = state.title;
  }
  if (query.get('subtitle') !== null) {
    state.subtitle = query.get('subtitle');
    document.getElementById('subtitle').value = state.subtitle;
  }
  const photo = query.get('photo') ?? 'pier';
  await loadSample(photo, 0);
  if (query.get('photo2')) await loadSample(query.get('photo2'), 1);
  state.panels.forEach((panel, i) => {
    panel.photo = i % 2 === 0 ? 0 : 1;
  });
  helpers.syncChoiceControls();
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await document.fonts.ready;
  redraw();
  if (shot === 'export') {
    const blob = await exportCover(state.size);
    window.__exportDataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    window.__exportBytes = blob.size;
    document.body.setAttribute('data-export-bytes', String(blob.size));
    document.body.setAttribute('data-export-type', blob.type);
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
