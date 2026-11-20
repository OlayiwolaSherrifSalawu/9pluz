import Lenis from 'lenis';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const root = document.documentElement;
root.classList.remove('no-js');

/* ---------- shared scroll state ----------
   One loop reads scroll position and velocity; everything scroll-linked reads from here. */
export const scroll = { y: scrollY, v: 0, dir: 1 as 1 | -1 };
type Listener = (s: typeof scroll) => void;
const listeners: Listener[] = [];
export const onScroll = (fn: Listener) => listeners.push(fn);
(window as any).__onScroll = onScroll;
(window as any).__scroll = scroll;

let lenis: Lenis | null = null;
if (!reduce) {
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
  (window as any).__lenis = lenis;
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href')!);
      if (target) { e.preventDefault(); lenis!.scrollTo(target as HTMLElement, { offset: -80, duration: 1.4 }); }
    }),
  );
}

let lastY = scrollY;
let lastT = performance.now();
function frame(t: number) {
  lenis?.raf(t);
  const y = scrollY;
  const dt = Math.max(1, t - lastT);
  const raw = (y - lastY) / dt; // px per ms
  scroll.v += (raw - scroll.v) * 0.18; // smoothed
  if (Math.abs(raw) > 0.02) scroll.dir = raw > 0 ? 1 : -1;
  scroll.y = y;
  lastY = y; lastT = t;
  for (const fn of listeners) fn(scroll);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- reading progress + header that steps aside on the way down ---------- */
const progress = document.createElement('div');
progress.className = 'progress';
progress.setAttribute('aria-hidden', 'true');
progress.innerHTML = '<span></span>';
document.body.appendChild(progress);
const header = document.querySelector<HTMLElement>('.site-header');
let headerHidden = false;
onScroll(({ y, dir }) => {
  const max = root.scrollHeight - innerHeight;
  progress.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : '0');
  if (!header || reduce) return;
  const menuOpen = header.querySelector('[aria-expanded="true"]');
  const shouldHide = dir === 1 && y > innerHeight * 0.6 && !menuOpen && !header.contains(document.activeElement);
  if (shouldHide !== headerHidden) {
    headerHidden = shouldHide;
    header.classList.toggle('is-tucked', shouldHide);
    progress.classList.toggle('is-tucked', shouldHide);
    root.classList.toggle('header-tucked', shouldHide);
  }
});

/* ---------- stacked panels ---------- */
const panels = [...document.querySelectorAll<HTMLElement>('.panel[data-stack]')];
const MAX_TILT = -3;
function measure() {
  const vh = innerHeight;
  for (const p of panels) p.style.setProperty('--stick', `${Math.min(0, vh - p.offsetHeight)}px`);
}
if (panels.length) {
  measure();
  addEventListener('resize', measure);
  new ResizeObserver(measure).observe(document.body);
  if (!reduce) {
    onScroll(() => {
      const vh = innerHeight;
      panels.forEach((p, i) => {
        if (i === 0) return;
        const top = p.getBoundingClientRect().top;
        if (top > vh * 1.2 || top < -vh * 0.2) return;
        const progress = Math.min(1, Math.max(0, 1 - top / vh));
        p.style.setProperty('--tilt', `${((1 - progress) * MAX_TILT).toFixed(3)}deg`);
      });
    });
  }
}

/* ---------- choreography: give siblings cascading delays ---------- */
function assignDelays() {
  // headline lines
  document.querySelectorAll('h1, h2, .mega, .display').forEach((h) => {
    h.querySelectorAll<HTMLElement>(':scope > .mega-reveal, :scope > span > .mega-reveal').forEach((el, i) => el.style.setProperty('--d', `${i * 110}ms`));
  });
  // grouped items (cards, principles, rows)
  const groups = new Map<Element, HTMLElement[]>();
  document.querySelectorAll<HTMLElement>('.reveal').forEach((el) => {
    const parent = el.parentElement!;
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent)!.push(el);
  });
  groups.forEach((els) => els.forEach((el, i) => {
    if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', `${Math.min(i, 8) * 70}ms`);
  }));
}
assignDelays();

const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
}, { rootMargin: '0px 0px -10% 0px' });
document.querySelectorAll('[data-reveal], .reveal, .doodle').forEach((el) => io.observe(el));

/* ---------- headline drift: lines slide against each other as they pass ---------- */
if (!reduce) {
  const titles = [...document.querySelectorAll<HTMLElement>('[data-drift]')];
  onScroll(() => {
    const vh = innerHeight;
    for (const t of titles) {
      const r = t.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      const p = (r.top + r.height / 2) / vh - 0.5; // -0.5 top .. 0.5 bottom
      t.querySelectorAll<HTMLElement>('.mega-reveal').forEach((line, i) => {
        const dirn = i % 2 === 0 ? 1 : -1;
        line.style.setProperty('--drift', `${(p * dirn * Math.min(innerWidth * 0.06, 90)).toFixed(1)}px`);
      });
    }
  });
}

/* ---------- parallax images ---------- */
if (!reduce) {
  const imgs = [...document.querySelectorAll<HTMLElement>('[data-parallax]')];
  onScroll(() => {
    const vh = innerHeight;
    for (const el of imgs) {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      const p = (r.top + r.height / 2) / vh - 0.5;
      el.style.setProperty('--py', `${(p * -60).toFixed(1)}px`);
    }
  });
}

/* ---------- marquees speed up with scroll and follow its direction ---------- */
if (!reduce) {
  const tracks = [...document.querySelectorAll<HTMLElement>('.marquee .track')];
  let rate = 1;
  onScroll(({ v, dir }) => {
    const target = dir * (1 + Math.min(Math.abs(v) * 6, 6));
    rate += (target - rate) * 0.08;
    for (const t of tracks) for (const a of t.getAnimations()) a.playbackRate = rate;
  });
}

/* ---------- magnetic buttons: they lean toward the cursor ---------- */
if (fine && !reduce) {
  document.querySelectorAll<HTMLElement>('.btn--solid, .btn--orange, .float-cta, [data-magnetic]').forEach((el) => {
    el.setAttribute('data-magnetic', '');
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.setProperty('--mx', `${(x * 0.18).toFixed(1)}px`);
      el.style.setProperty('--my', `${(y * 0.28).toFixed(1)}px`);
    });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--mx', '0px'); el.style.setProperty('--my', '0px'); });
  });
}

/* ---------- floating CTA steps out of the way over the footer ---------- */
const cta = document.querySelector<HTMLElement>('[data-float-cta]');
const footer = document.querySelector('.site-footer');
if (cta && footer) new IntersectionObserver(([e]) => cta.classList.toggle('is-hidden', e.isIntersecting)).observe(footer);
