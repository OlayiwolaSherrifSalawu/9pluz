import { CanvasTexture, SRGBColorSpace, LinearMipmapLinearFilter, type WebGLRenderer } from 'three';

const BODY = '"Archivo Variable", Archivo, Helvetica, Arial, sans-serif';
const DISPLAY = 'Anton, Impact, "Arial Narrow", sans-serif';
const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImage(src: string) {
  if (!imageCache.has(src)) {
    imageCache.set(src, new Promise((res, rej) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = src;
    }));
  }
  return imageCache.get(src)!;
}

export async function fontsReady() {
  try {
    await Promise.all([
      document.fonts.load(`350 32px ${BODY}`),
      document.fonts.load(`400 32px ${DISPLAY}`),
    ]);
  } catch {}
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line); line = w;
      if (lines.length === maxLines) break;
    } else line = test;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(last + '…').width > maxW && last.length > 1) last = last.slice(0, -1);
    lines[maxLines - 1] = last.replace(/\s+\S*$/, '') + '…';
  }
  return lines;
}

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / s, sh = h / s;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

function toTexture(canvas: HTMLCanvasElement, renderer?: WebGLRenderer) {
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearMipmapLinearFilter;
  if (renderer) tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return tex;
}

export interface CardData { title: string; category: string; image: string; partner?: boolean; date?: string }

/** Black story card: square photo, category, title and an orange chip (spec §7 "Cards") */
export async function cardTexture(d: CardData, renderer?: WebGLRenderer) {
  const W = 600, H = 840, pad = 34;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  try { cover(ctx, await loadImage(d.image), pad, pad, W - pad * 2, W - pad * 2); } catch { ctx.fillStyle = '#222'; ctx.fillRect(pad, pad, W - pad * 2, W - pad * 2); }
  let y = W - pad + 46;
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.font = `350 24px ${BODY}`;
  ctx.fillText(`${d.category}${d.date ? '  ·  ' + d.date : ''}`, pad, y);
  y += 46;
  ctx.fillStyle = '#fff';
  ctx.font = `400 36px ${BODY}`;
  for (const l of wrap(ctx, d.title, W - pad * 2, 3)) { ctx.fillText(l, pad, y); y += 42; }
  // chip
  const chip = d.partner ? 'Client story' : 'Read story';
  ctx.font = `400 24px ${BODY}`;
  const cw = ctx.measureText(chip).width + 36;
  ctx.fillStyle = '#ec8835';
  ctx.beginPath(); ctx.roundRect(pad, H - pad - 44, cw, 44, 22); ctx.fill();
  ctx.fillStyle = '#000';
  ctx.fillText(chip, pad + 18, H - pad - 14);
  ctx.fillStyle = '#fff'; ctx.font = `400 26px ${DISPLAY}`;
  ctx.fillText('99+', W - pad - 40, H - pad - 12);
  return toTexture(c, renderer);
}

export interface PaperData { quote: string; name: string; role: string; image?: string }

/** White paper sheet for testimonials (spec §6.4 §5) */
export async function paperTexture(d: PaperData, renderer?: WebGLRenderer) {
  const W = 900, H = 640, pad = 56;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,.04)';
  for (let i = 0; i < 1400; i++) ctx.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); // paper grain
  ctx.fillStyle = '#000';
  ctx.font = `350 34px ${BODY}`;
  let y = pad + 34;
  for (const l of wrap(ctx, `“${d.quote}”`, W - pad * 2, 9)) { ctx.fillText(l, pad, y); y += 44; }
  const ay = H - pad - 88;
  if (d.image) {
    try {
      const img = await loadImage(d.image);
      ctx.save(); ctx.filter = 'grayscale(1)'; cover(ctx, img, pad, ay, 88, 88); ctx.restore();
    } catch {}
  }
  const tx = d.image ? pad + 112 : pad;
  ctx.fillStyle = '#000'; ctx.font = `400 32px ${BODY}`; ctx.fillText(d.name, tx, ay + 38);
  ctx.fillStyle = '#9c9c9c'; ctx.font = `350 26px ${BODY}`; ctx.fillText(d.role, tx, ay + 76);
  ctx.fillStyle = '#ec8835'; ctx.font = `400 48px ${DISPLAY}`; ctx.fillText('99+', W - pad - 80, ay + 66);
  return toTexture(c, renderer);
}

/** Black dry-brush ellipse stroke on transparent, drawn as many jittered bristle passes */
export function brushRingTexture(color = '#000', renderer?: WebGLRenderer) {
  const S = 1024;
  const c = document.createElement('canvas'); c.width = S; c.height = S;
  const ctx = c.getContext('2d')!;
  ctx.strokeStyle = color; ctx.lineCap = 'round';
  const cx = S / 2, cy = S / 2;
  const R = S * 0.42;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let b = 0; b < 70; b++) {
    const off = (rnd() - 0.5) * 46;
    ctx.globalAlpha = 0.35 + rnd() * 0.6;
    ctx.lineWidth = 2 + rnd() * 7;
    ctx.beginPath();
    const start = rnd() * 0.3, end = Math.PI * 2 * (0.9 + rnd() * 0.12);
    for (let a = start; a < end; a += 0.02) {
      const wob = Math.sin(a * 3 + b) * 6;
      const x = cx + Math.cos(a) * (R + off + wob);
      const y = cy + Math.sin(a) * (R + off + wob);
      if (a === start) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return toTexture(c, renderer);
}

/** A white "app screen" collage of the team, for the tilted plane */
export async function teamScreenTexture(people: { name: string; role: string; image: string }[], renderer?: WebGLRenderer) {
  const W = 1400, H = 900, pad = 48;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#000'; ctx.font = `400 30px ${BODY}`; ctx.fillText('99 PLUZ', pad, pad + 24);
  ctx.fillStyle = '#9c9c9c'; ctx.font = `350 24px ${BODY}`; ctx.fillText('The team  ·  Music PR, culture & media', pad + 150, pad + 24);
  ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(pad, pad + 50, W - pad * 2, 2);
  const cols = people.length;
  const gap = 28;
  const cw = (W - pad * 2 - gap * (cols - 1)) / cols;
  const top = pad + 84;
  for (let i = 0; i < cols; i++) {
    const p = people[i];
    const x = pad + i * (cw + gap);
    ctx.fillStyle = '#000'; ctx.fillRect(x, top, cw, H - top - pad);
    try { const img = await loadImage(p.image); cover(ctx, img, x + 20, top + 20, cw - 40, cw - 40); } catch {}
    ctx.fillStyle = '#fff'; ctx.font = `400 34px ${BODY}`; ctx.fillText(p.name, x + 20, top + cw + 30);
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = `350 24px ${BODY}`; ctx.fillText(p.role, x + 20, top + cw + 66);
  }
  return toTexture(c, renderer);
}
