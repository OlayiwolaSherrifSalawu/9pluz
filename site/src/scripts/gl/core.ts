import { WebGLRenderer, Scene, PerspectiveCamera, SRGBColorSpace } from 'three';

export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

/** cubic-bezier easing, used for the spec's heavy curve (.55,0,.1,1) */
export function bezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) { const e = sx(t) - x; const d = dx(t); if (Math.abs(e) < 1e-5 || !d) break; t -= e / d; }
    return sy(Math.min(1, Math.max(0, t)));
  };
}
export const easeHeavy = bezier(0.55, 0, 0.1, 1);

export interface Stage {
  el: HTMLElement;
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  width: number;
  height: number;
  visible: boolean;
  render: () => void;
  onResize: (fn: (w: number, h: number) => void) => void;
  loop: (fn: (t: number, dt: number) => void) => void;
}

/** Creates a renderer inside `el` (which should contain a .gl__fallback for no-WebGL). Returns null on failure. */
export function createStage(el: HTMLElement, fov = 30): Stage | null {
  if (!webglAvailable()) { el.classList.add('gl--fallback'); return null; }
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch { el.classList.add('gl--fallback'); return null; }
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  el.prepend(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(fov, 1, 0.1, 100);
  const resizeFns: ((w: number, h: number) => void)[] = [];
  const stage: Stage = {
    el, renderer, scene, camera, width: 1, height: 1, visible: false,
    render: () => renderer.render(scene, camera),
    onResize: (fn) => { resizeFns.push(fn); fn(stage.width, stage.height); },
    loop: (fn) => {
      let last = performance.now();
      const tick = (t: number) => {
        const dt = Math.min(64, t - last); last = t;
        if (stage.visible) { fn(t, dt); renderer.render(scene, camera); }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
  };
  const resize = () => {
    // layout size, not getBoundingClientRect: the intro rotates these containers with CSS transforms
    stage.width = Math.max(1, el.clientWidth); stage.height = Math.max(1, el.clientHeight);
    renderer.setSize(stage.width, stage.height, false);
    camera.aspect = stage.width / stage.height;
    camera.updateProjectionMatrix();
    resizeFns.forEach((fn) => fn(stage.width, stage.height));
    renderer.render(scene, camera);
  };
  new ResizeObserver(resize).observe(el);
  resize();
  new IntersectionObserver(([e]) => (stage.visible = e.isIntersecting), { rootMargin: '200px' }).observe(el);
  renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); el.classList.add('gl--fallback'); });
  return stage;
}

/** progress of an element through the viewport: 0 when its top hits the bottom, 1 when its bottom leaves the top */
export function viewProgress(el: Element) {
  const r = el.getBoundingClientRect();
  const vh = innerHeight;
  return Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
}

/** Like viewProgress, but keeps advancing while the element's sheet is pinned (sticky).
 *  Measures against a marker left in normal flow just before the sheet. */
const markers = new WeakMap<Element, HTMLElement>();
export function scrollProgress(el: Element) {
  const sheet = el.closest<HTMLElement>('.panel[data-stack]');
  if (!sheet) return viewProgress(el);
  let m = markers.get(sheet);
  if (!m) { m = document.createElement('div'); m.setAttribute('aria-hidden', 'true'); sheet.before(m); markers.set(sheet, m); }
  const top = m.getBoundingClientRect().top + scrollY;
  const hold = parseFloat(getComputedStyle(sheet).marginBottom) || 0;
  const vh = innerHeight;
  return Math.min(1, Math.max(0, (scrollY + vh - top) / (vh + sheet.offsetHeight + hold)));
}
