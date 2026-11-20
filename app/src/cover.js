// Vice Coast cover engine: draws a multi-panel poster cover onto a canvas.
// A cover is a set of photo panels in a layout, a colour grade, and a bold
// caption block. Every drawing step is local: photos come from the user's
// own files or the bundled samples, fonts are the vendored OFL files, and
// nothing here reaches the network.

export const LAYOUTS = {
  grid4: { label: 'Four Panel Grid', panels: 4 },
  hero: { label: 'Hero and Three', panels: 4 },
  fullbleed: { label: 'Full Bleed', panels: 1 },
  snapshots: { label: 'Tilted Snapshots', panels: 3 },
};

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    filter: 'saturate(1.25) contrast(1.08) sepia(0.18) hue-rotate(-8deg)',
    wash: ['rgba(255, 122, 26, 0.20)', 'rgba(214, 51, 132, 0.28)', 'rgba(43, 24, 56, 0.30)'],
  },
  neon: {
    label: 'Neon Nights',
    filter: 'saturate(1.65) contrast(1.16) hue-rotate(14deg) brightness(1.05)',
    wash: ['rgba(255, 45, 149, 0.24)', 'rgba(0, 229, 255, 0.20)', 'rgba(16, 8, 44, 0.32)'],
  },
  golden: {
    label: 'Golden Hour',
    filter: 'saturate(1.30) sepia(0.35) contrast(1.05) brightness(1.08)',
    wash: ['rgba(255, 196, 66, 0.22)', 'rgba(255, 120, 40, 0.18)', 'rgba(60, 30, 8, 0.26)'],
  },
  noir: {
    label: 'Noir',
    filter: 'grayscale(1) contrast(1.22) brightness(0.96)',
    wash: ['rgba(200, 200, 210, 0.10)', 'rgba(20, 20, 28, 0.22)', 'rgba(0, 0, 0, 0.34)'],
  },
};

export const SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  '1920x1080': { w: 1920, h: 1080, label: 'Landscape 1920 x 1080' },
};

const GAP = 10; // white gutter between panels, in export pixels at 1080 wide

function panelRects(layout, w, h) {
  const g = Math.round((w / 1080) * GAP);
  const pad = g;
  if (layout === 'grid4') {
    const cw = (w - pad * 3) / 2;
    const ch = (h - pad * 3) / 2;
    return [
      { x: pad, y: pad, w: cw, h: ch },
      { x: pad * 2 + cw, y: pad, w: cw, h: ch },
      { x: pad, y: pad * 2 + ch, w: cw, h: ch },
      { x: pad * 2 + cw, y: pad * 2 + ch, w: cw, h: ch },
    ];
  }
  if (layout === 'hero') {
    const heroW = Math.round(w * 0.62) - pad;
    const sideX = pad * 2 + heroW;
    const sideW = w - sideX - pad;
    const sh = (h - pad * 4) / 3;
    return [
      { x: pad, y: pad, w: heroW, h: h - pad * 2 },
      { x: sideX, y: pad, w: sideW, h: sh },
      { x: sideX, y: pad * 2 + sh, w: sideW, h: sh },
      { x: sideX, y: pad * 3 + sh * 2, w: sideW, h: sh },
    ];
  }
  if (layout === 'snapshots') {
    const pw = w * 0.42;
    const ph = h * 0.52;
    return [
      { x: w * 0.06, y: h * 0.05, w: pw, h: ph, rotate: -5 },
      { x: w * 0.52, y: h * 0.10, w: pw, h: ph, rotate: 4 },
      { x: w * 0.28, y: h * 0.42, w: pw, h: ph, rotate: -2 },
    ];
  }
  return [{ x: pad, y: pad, w: w - pad * 2, h: h - pad * 2 }];
}

function drawPhotoInto(ctx, photo, rect, panel, grade) {
  const { x, y, w, h } = rect;
  ctx.save();
  if (rect.rotate) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((rect.rotate * Math.PI) / 180);
    ctx.translate(-w / 2, -h / 2);
  } else {
    ctx.translate(x, y);
  }
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  if (!photo) {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#ff7a1a');
    sky.addColorStop(0.55, '#d63384');
    sky.addColorStop(1, '#2b1838');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `${Math.round(h * 0.06)}px Anton, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('ADD A PHOTO', w / 2, h / 2);
  } else {
    const zoom = panel?.zoom ?? 1;
    const dx = panel?.dx ?? 0;
    const dy = panel?.dy ?? 0;
    const base = Math.max(w / photo.naturalWidth, h / photo.naturalHeight) * zoom;
    const pw = photo.naturalWidth * base;
    const ph = photo.naturalHeight * base;
    ctx.filter = grade.filter;
    ctx.drawImage(photo, (w - pw) / 2 + dx * (pw - w) * 0.5, (h - ph) / 2 + dy * (ph - h) * 0.5, pw, ph);
    ctx.filter = 'none';
  }
  ctx.restore();
  if (rect.rotate) {
    // Polaroid-style white border around a tilted snapshot.
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((rect.rotate * Math.PI) / 180);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(4, w * 0.015);
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }
}

function drawWash(ctx, w, h, grade) {
  const wash = ctx.createLinearGradient(0, 0, w, h);
  wash.addColorStop(0, grade.wash[0]);
  wash.addColorStop(0.5, grade.wash[1]);
  wash.addColorStop(1, grade.wash[2]);
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawGrain(ctx, w, h, seed) {
  ctx.save();
  ctx.globalAlpha = 0.05;
  let s = seed;
  const next = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const step = Math.max(2, Math.round(w / 480));
  for (let gy = 0; gy < h; gy += step) {
    for (let gx = 0; gx < w; gx += step) {
      const v = next();
      ctx.fillStyle = v > 0.5 ? '#ffffff' : '#000000';
      ctx.fillRect(gx, gy, step, step);
    }
  }
  ctx.restore();
}

function drawVignette(ctx, w, h) {
  const edge = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, w, h);
}

function fitFont(ctx, text, fontName, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px ${fontName}`;
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size -= 2;
    ctx.font = `${size}px ${fontName}`;
  }
  return size;
}

function drawCaption(ctx, w, h, state) {
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  const bandH = h * (subtitle ? 0.24 : 0.19);
  const bandY = h - bandH;
  const shade = ctx.createLinearGradient(0, bandY - h * 0.06, 0, h);
  shade.addColorStop(0, 'rgba(10, 4, 24, 0)');
  shade.addColorStop(1, 'rgba(10, 4, 24, 0.82)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, bandY - h * 0.06, w, bandH + h * 0.06);

  const accent = state.grade === 'neon' ? '#00e5ff' : state.grade === 'noir' ? '#e8e8e8' : '#ffb703';
  const barW = w * 0.5;
  ctx.fillStyle = accent;
  ctx.fillRect((w - barW) / 2, bandY + h * 0.018, barW, Math.max(4, h * 0.006));

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (title) {
    const size = fitFont(ctx, title, 'Anton, sans-serif', w * 0.92, h * 0.115 * (state.titleScale ?? 1));
    ctx.font = `${size}px Anton, sans-serif`;
    ctx.lineWidth = Math.max(3, size * 0.09);
    ctx.strokeStyle = 'rgba(12, 4, 28, 0.9)';
    ctx.shadowColor = 'rgba(255, 45, 149, 0.55)';
    ctx.shadowBlur = size * 0.22;
    ctx.strokeText(title, w / 2, bandY + size * 1.05);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title, w / 2, bandY + size * 1.05);
    ctx.lineWidth = 1;
    if (subtitle) {
      const subSize = fitFont(ctx, subtitle, 'Pacifico, cursive', w * 0.8, h * 0.042);
      ctx.font = `${subSize}px Pacifico, cursive`;
      ctx.fillStyle = accent;
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = subSize * 0.3;
      ctx.fillText(subtitle, w / 2, bandY + size * 1.05 + subSize * 1.5);
      ctx.shadowBlur = 0;
    }
  }
}

function drawFrame(ctx, w, h, state) {
  const pad = Math.round((w / 1080) * GAP);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(3, pad);
  ctx.strokeRect(pad / 2, pad / 2, w - pad, h - pad);
  const badge = 'VICE COAST';
  const size = Math.round(h * 0.022);
  ctx.font = `${size}px Anton, sans-serif`;
  const bw = ctx.measureText(badge).width + size * 1.6;
  const bh = size * 2.1;
  ctx.fillStyle = '#ff2d95';
  ctx.fillRect(w - bw - pad * 1.4, pad * 1.4, bw, bh);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge, w - bw / 2 - pad * 1.4, pad * 1.4 + bh / 2 + 1);
  ctx.textBaseline = 'alphabetic';
}

/** Draws the whole cover for `state` onto `canvas` (its own pixel size). */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const layout = state.layout ?? 'grid4';

  const sky = ctx.createLinearGradient(0, 0, w, h);
  sky.addColorStop(0, '#1b0f2e');
  sky.addColorStop(0.5, '#7c1d5e');
  sky.addColorStop(1, '#ff7a1a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const rects = panelRects(layout, w, h);
  const panels = state.panels ?? [];
  rects.forEach((rect, i) => {
    const panel = panels[i] ?? { photo: 0, zoom: 1, dx: 0, dy: 0 };
    const photo = state.photos?.[panel.photo] ?? null;
    drawPhotoInto(ctx, photo, rect, panel, grade);
  });

  drawWash(ctx, w, h, grade);
  if (state.vignette !== false) drawVignette(ctx, w, h);
  if (state.grain !== false) drawGrain(ctx, w, h, 1234567);
  drawCaption(ctx, w, h, state);
  if (state.frame !== false) drawFrame(ctx, w, h, state);
}

/** The panel rectangles (fractions of the canvas) for hit-testing clicks. */
export function panelRectsFor(layout, w, h) {
  return panelRects(layout, w, h);
}
