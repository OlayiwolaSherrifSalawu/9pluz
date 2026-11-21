import Lenis from 'lenis';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
root.classList.remove('no-js');

/* ---------- shared scroll loop: one rAF drives Lenis and every scroll-linked effect ---------- */
export const scroll = { y: scrollY, v: 0, dir: 1 as 1 | -1, vh: innerHeight };
type Listener = (s: typeof scroll, t: number) => void;
const listeners: Listener[] = [];
export const onFrame = (fn: Listener) => listeners.push(fn);
(window as any).__onFrame = onFrame;
(window as any).__scroll = scroll;

let lenis: Lenis | null = null;
if (!reduce) {
  lenis = new Lenis({ lerp: 0.1 });
  (window as any).__lenis = lenis;
  if (root.classList.contains('is-loading')) lenis.stop();
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href')!);
      if (target) { e.preventDefault(); lenis!.scrollTo(target as HTMLElement, { offset: 0, duration: 1.5 }); }
    }),
  );
}

let lastY = scrollY;
let lastT = performance.now();
function frame(t: number) {
  lenis?.raf(t);
  const y = scrollY;
  const raw = (y - lastY) / Math.max(1, t - lastT);
  scroll.v += (raw - scroll.v) * 0.18;
  if (Math.abs(raw) > 0.02) scroll.dir = raw > 0 ? 1 : -1;
  scroll.y = y; scroll.vh = innerHeight;
  lastY = y; lastT = t;
  for (const fn of listeners) fn(scroll, t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- loader -> intro (spec §6.3) ---------- */
function showIntro() {
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('intro--show')));
  setTimeout(() => root.classList.add('intro--done'), 1700);
}
if (root.classList.contains('is-loading')) {
  const started = performance.now();
  const done = () => {
    const wait = Math.max(0, 1600 - (performance.now() - started));
    setTimeout(() => {
      root.classList.add('is-loaded');
      root.classList.remove('is-loading');
      lenis?.start();
      try { sessionStorage.setItem('99pluz-loaded', '1'); } catch {}
      showIntro();
    }, wait);
  };
  const ready = Promise.all([document.fonts.ready, new Promise((r) => (document.readyState === 'complete' ? r(0) : addEventListener('load', r, { once: true })))]);
  Promise.race([ready, new Promise((r) => setTimeout(r, 3200))]).then(done);
} else {
  showIntro();
}

/* ---------- full-bleed wordmarks: fit the font size to the container width ---------- */
function fitWordmarks() {
  document.querySelectorAll<HTMLElement>('[data-fit]').forEach((el) => {
    const text = el.querySelector<HTMLElement>('.wm-text');
    if (!text) return;
    el.style.fontSize = '100px';
    const natural = text.offsetWidth;
    const w = el.clientWidth;
    if (natural > 0) el.style.fontSize = `${(100 * w) / natural}px`;
  });
}
document.fonts.ready.then(fitWordmarks);
fitWordmarks();
addEventListener('resize', fitWordmarks);

/* ---------- sheets: tilt 15° clockwise from the top-left and flatten quadratically (spec §6.2) ---------- */
const panels = [...document.querySelectorAll<HTMLElement>('.panel[data-stack]')];
function measure() {
  const vh = innerHeight;
  for (const p of panels) p.style.setProperty('--stick', `${Math.min(0, vh - p.offsetHeight)}px`);
}
if (panels.length) {
  measure();
  addEventListener('resize', measure);
  new ResizeObserver(measure).observe(document.body);
  if (!reduce) {
    onFrame(({ vh }) => {
      panels.forEach((p, i) => {
        if (i === 0 && p.getBoundingClientRect().top <= 0) return;
        const top = p.getBoundingClientRect().top;
        if (top > vh * 1.3) return;
        const k = Math.min(Math.max(top / vh, 0), 1);
        const deg = 15 * k * k;
        p.style.setProperty('--tilt', `${deg.toFixed(3)}deg`);
        p.style.setProperty('--tx', `${(deg * 0.5741).toFixed(3)}%`);
      });
    });
  }
}

/* ---------- header colour follows the section beneath it (spec §3.3) ---------- */
const header = document.querySelector<HTMLElement>('[data-header]');
const themed = [...document.querySelectorAll<HTMLElement>('[data-theme]')];
const THEME_BG: Record<string, string> = { orange: 'var(--c-orange)', green: 'var(--c-green)', pink: 'var(--c-pink)', blue: 'var(--c-blue)', black: '#000', paper: 'var(--c-orange)' };
let currentTheme = '';
if (header && themed.length) {
  onFrame(() => {
    const line = header.offsetHeight;
    let pick: HTMLElement | null = null;
    for (const el of themed) {
      const r = el.getBoundingClientRect();
      // later sheets always stack on top of earlier pinned ones, so the last match in page order wins
      if (r.top <= line && r.bottom > line) pick = el;
    }
    const theme = pick?.dataset.theme ?? 'orange';
    if (theme !== currentTheme) {
      currentTheme = theme;
      header.style.setProperty('--hbg', THEME_BG[theme] ?? 'var(--c-orange)');
    }
  });
}

/* ---------- reveals with cascading delays ---------- */
document.querySelectorAll('h1, h2, h3, .mega, .display, p').forEach((h) => {
  h.querySelectorAll<HTMLElement>(':scope > .mega-reveal').forEach((el, i) => el.style.setProperty('--d', `${i * 120}ms`));
});
const groups = new Map<Element, HTMLElement[]>();
document.querySelectorAll<HTMLElement>('.reveal').forEach((el) => {
  const parent = el.parentElement!;
  if (!groups.has(parent)) groups.set(parent, []);
  groups.get(parent)!.push(el);
});
groups.forEach((els) => els.forEach((el, i) => { if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', `${Math.min(i, 8) * 80}ms`); }));

const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
}, { rootMargin: '0px 0px -10% 0px' });
document.querySelectorAll('[data-reveal], .reveal, .doodle, .uwipe, .wordmark:not(.wordmark--intro)').forEach((el) => io.observe(el));

/* ---------- parallax ---------- */
if (!reduce) {
  const els = [...document.querySelectorAll<HTMLElement>('[data-parallax]')];
  if (els.length) onFrame(({ vh }) => {
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      const k = (r.top + r.height / 2) / vh - 0.5;
      el.style.setProperty('--py', `${(k * -Number(el.dataset.parallax || 60)).toFixed(1)}px`);
    }
  });
}

/* ---------- custom scrollbar: 1px thumb on the right edge, fades when idle (spec §6.5) ---------- */
const bar = document.querySelector<HTMLElement>('.scrollbar');
const thumb = bar?.querySelector<HTMLElement>('.scrollbar__thumb');
if (bar && thumb) {
  let idle = 0;
  let lastScroll = -1;
  onFrame(({ y, vh }, t) => {
    const docH = root.scrollHeight;
    const th = Math.max(48, (vh / docH) * vh);
    const ty = docH > vh ? (y / (docH - vh)) * (vh - th) : 0;
    thumb.style.setProperty('--th', `${th}px`);
    thumb.style.setProperty('--ty', `${ty}px`);
    if (y !== lastScroll) { lastScroll = y; idle = t; bar.classList.add('is-active'); }
    else if (t - idle > 900) bar.classList.remove('is-active');
  });
  let dragging = false; let startY = 0; let startScroll = 0;
  thumb.addEventListener('pointerdown', (e) => { dragging = true; startY = e.clientY; startScroll = scrollY; thumb.setPointerCapture(e.pointerId); });
  thumb.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const vh = innerHeight; const docH = root.scrollHeight; const th = Math.max(48, (vh / docH) * vh);
    const target = startScroll + ((e.clientY - startY) / (vh - th)) * (docH - vh);
    lenis ? lenis.scrollTo(target, { immediate: true }) : scrollTo(0, target);
  });
  thumb.addEventListener('pointerup', () => (dragging = false));
}

/* ---------- floating button steps aside over the footer ---------- */
const cta = document.querySelector<HTMLElement>('[data-float-cta]');
const footer = document.querySelector('.site-footer');
if (cta && footer && innerWidth < 980) new IntersectionObserver(([e]) => cta.classList.toggle('is-hidden', e.isIntersecting)).observe(footer);
