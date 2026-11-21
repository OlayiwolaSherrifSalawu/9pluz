// Fluid wordmark: letters behave like beads on a slack, springy rope.
// The cursor drags nearby letters up or down (gaussian falloff), neighbours pull on each other so the
// word sags and bends through the cursor, letters tilt along the curve and stretch with speed.
// With no cursor, a slow shallow wave keeps it moving.

interface Bead { el: HTMLElement; cx: number; y: number; v: number; rot: number; sy: number }

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function mount(word: HTMLElement) {
  const text = word.querySelector<HTMLElement>('.wm-text');
  const zone = word.closest<HTMLElement>('[data-flow-zone]') ?? word;
  if (!text) return;
  const beads: Bead[] = [...text.querySelectorAll<HTMLElement>('.ch')].map((el) => ({ el, cx: 0, y: 0, v: 0, rot: 0, sy: 1 }));
  if (!beads.length) return;

  // scroll-revealed wordmarks unfold inside a clipped box; release the clip once that has finished
  if (!word.classList.contains('wordmark--intro')) {
    const free = () => setTimeout(() => word.classList.add('flow-free'), 1300);
    if (word.classList.contains('is-in')) free();
    else new MutationObserver((_, o) => { if (word.classList.contains('is-in')) { o.disconnect(); free(); } }).observe(word, { attributes: true, attributeFilter: ['class'] });
  }

  // only animate while on screen
  let onScreen = true;
  new IntersectionObserver(([e]) => (onScreen = e.isIntersecting), { rootMargin: '150px' }).observe(word);

  let fontPx = 100, width = 1, midY = 0, left = 0;
  const measure = () => {
    fontPx = parseFloat(getComputedStyle(word).fontSize) || 100;
    const r = text.getBoundingClientRect();
    width = r.width; left = r.left; midY = r.top + r.height / 2;
    beads.forEach((b) => { b.cx = b.el.offsetLeft + b.el.offsetWidth / 2; });
  };
  measure();
  addEventListener('resize', measure);
  document.fonts.ready.then(measure);
  new ResizeObserver(measure).observe(word);

  // pointer state, smoothed
  let mx = 0, my = 0, active = 0, activeTarget = 0, lastMx = 0, speed = 0;
  zone.addEventListener('pointermove', (e) => {
    const r = text.getBoundingClientRect();
    left = r.left; midY = r.top + r.height / 2;
    mx = e.clientX - left; my = e.clientY - midY;
    activeTarget = 1;
  });
  zone.addEventListener('pointerleave', () => (activeTarget = 0));

  const K = 0.045;      // spring to target (lower = saggier)
  const NEIGH = 0.18;   // pull toward neighbours (rope)
  const DAMP = 0.86;    // < 1 keeps a little overshoot so it settles with a wobble
  let t0 = performance.now();

  const tick = (t: number) => {
    if (!onScreen) { requestAnimationFrame(tick); return; }
    const time = (t - t0) / 1000;
    active += (activeTarget - active) * 0.06;
    speed += (Math.abs(mx - lastMx) - speed) * 0.15; lastMx = mx;
    const amp = fontPx * 0.12;                     // max lift/sag
    const reach = Math.max(width * 0.22, fontPx * 0.9);
    const pull = Math.max(-amp, Math.min(amp, my * 0.55));

    beads.forEach((b, i) => {
      // idle: slow travelling wave, always present but shallow
      const idle = Math.sin(time * 1.1 - i * 0.75) * fontPx * 0.018;
      // hover: letters near the cursor follow it vertically; a counter-wave makes one side rise as the other sinks
      const d = (b.cx - mx) / reach;
      const fall = Math.exp(-d * d);
      const counter = Math.sin(d * 2.2) * amp * 0.45 * Math.min(1, speed / 6 + 0.35);
      const target = idle * (1 - active * 0.6) + active * fall * (pull - counter);
      // rope: neighbours drag each other, which is what makes it sag rather than jump
      const prev = beads[i - 1]?.y ?? b.y, next = beads[i + 1]?.y ?? b.y;
      const force = (target - b.y) * K + ((prev + next) / 2 - b.y) * NEIGH;
      b.v = (b.v + force) * DAMP;
      b.y += b.v;
    });

    beads.forEach((b, i) => {
      // tilt along the curve formed with the neighbours (the bend)
      const a = beads[i - 1], c = beads[i + 1];
      const dx = ((c?.cx ?? b.cx + 1) - (a?.cx ?? b.cx - 1)) || 1;
      const slope = ((c?.y ?? b.y) - (a?.y ?? b.y)) / dx;
      b.rot += (Math.atan(slope) * 57.3 * 0.9 - b.rot) * 0.25;
      // stretch with vertical speed, squash slightly when sagging low
      const targetSy = 1 + Math.max(-0.1, Math.min(0.14, Math.abs(b.v) / fontPx * 2.2)) - Math.max(0, b.y / fontPx) * 0.06;
      b.sy += (targetSy - b.sy) * 0.2;
      b.el.style.transform = `translate3d(0, ${b.y.toFixed(2)}px, 0) rotate(${b.rot.toFixed(2)}deg) scaleY(${b.sy.toFixed(3)})`;
    });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

if (!reduce) document.querySelectorAll<HTMLElement>('[data-flow]').forEach(mount);
