import { Mesh, PlaneGeometry, ShaderMaterial, Group, type Texture } from 'three';
import { createStage, easeHeavy, reduceMotion } from './core';
import { paperTexture, fontsReady, type PaperData } from './textures';

const vertex = /* glsl */ `
  uniform float uCurl;   // 0 flat .. 1 strongly curled from the right edge
  uniform float uBend;   // gentle overall bow
  uniform float uW;
  varying vec2 vUv;
  varying float vShade;
  void main() {
    vUv = uv;
    vec3 p = position;
    float x0 = uW * 0.5 - uCurl * uW * 0.85;        // where the curl starts
    float rc = 0.18 + 0.12 * (1.0 - uCurl);          // curl radius
    vShade = 0.0;
    if (p.x > x0 && uCurl > 0.001) {
      float th = (p.x - x0) / rc;
      th = min(th, 3.14159);
      p.x = x0 + rc * sin(th);
      p.z += rc * (1.0 - cos(th));
      vShade = th / 3.14159;
    }
    p.z -= uBend * p.x * p.x * 0.35;
    p.y += sin(p.x * 2.0) * 0.02 * uBend;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const fragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uAlpha;
  varying vec2 vUv;
  varying float vShade;
  void main() {
    vec4 c = texture2D(uMap, vUv);
    float shade = 1.0 - 0.38 * smoothstep(0.0, 1.0, vShade) + 0.08 * smoothstep(0.6, 1.0, vShade);
    gl_FragColor = vec4(c.rgb * shade, uAlpha);
    #include <colorspace_fragment>
  }
`;

export async function mountPapers(el: HTMLElement) {
  const data: PaperData[] = JSON.parse(el.dataset.papers || '[]');
  const root = el.closest<HTMLElement>('[data-papers-root]') ?? el;
  const stage = createStage(el, 30);
  if (!stage) return;
  const { scene, camera, renderer } = stage;
  await fontsReady();

  const W = 1.35, H = W * (640 / 900);
  const geo = new PlaneGeometry(W, H, 48, 4);
  const group = new Group();
  scene.add(group);
  const textures: Texture[] = await Promise.all(data.map((d) => paperTexture(d, renderer)));
  const meshes = textures.map((t) => {
    const m = new Mesh(geo, new ShaderMaterial({
      uniforms: { uMap: { value: t }, uCurl: { value: 0 }, uBend: { value: 0 }, uW: { value: W }, uAlpha: { value: 1 } },
      vertexShader: vertex, fragmentShader: fragment, transparent: true,
    }));
    group.add(m);
    return m;
  });
  const n = meshes.length;

  stage.onResize((w, h) => {
    const aspect = w / h;
    camera.position.set(0, 0, aspect < 0.9 ? 3.4 : 3.9);
    group.position.x = aspect < 0.9 ? -0.35 : -0.85;
  });

  let pos = 0;            // rendered position (fractional)
  let from = 0, to = 0, t0 = 0;
  const DUR = 800;
  const live = root.querySelector<HTMLElement>('[data-live]');
  const counter = root.querySelector<HTMLElement>('[data-count]');
  const go = (d: number) => {
    from = pos; to = Math.round(to) + d; t0 = performance.now();
    const i = ((to % n) + n) % n;
    if (counter) counter.textContent = `${String(i + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
    if (live) live.textContent = `${data[i].name}: ${data[i].quote}`;
  };
  root.querySelector('[data-prev]')?.addEventListener('click', () => go(-1));
  root.querySelector('[data-next]')?.addEventListener('click', () => go(1));
  root.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); });

  // drag to flip
  let sx = 0, dragging = false;
  el.addEventListener('pointerdown', (e) => { dragging = true; sx = e.clientX; });
  addEventListener('pointerup', (e) => { if (!dragging) return; dragging = false; const dx = e.clientX - sx; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); });

  stage.loop((t) => {
    const k = reduceMotion ? 1 : Math.min(1, (t - t0) / DUR);
    pos = from + (to - from) * easeHeavy(k);
    const idle = reduceMotion ? 0 : Math.sin(t * 0.0011) * 0.5 + 0.5;
    meshes.forEach((m, i) => {
      let o = ((i - pos) % n + n) % n;
      if (o > n - 1) o -= n;                 // range (-1, n-1]
      const u = m.material.uniforms;
      if (o >= 0) {
        // waiting papers fan out in an arc to the right and curl like paper
        m.position.set(o * 1.05, -o * 0.06, -o * 0.55);
        m.rotation.set(0, -o * 0.42, -o * 0.07);
        u.uCurl.value = Math.min(1, o) * 0.55 + Math.max(0, o - 1) * 0.15;
        u.uBend.value = Math.min(1, o) * 0.7 + 0.04 * idle;
        u.uAlpha.value = Math.max(0, 1 - Math.max(0, o - 1.6) * 1.5);
      } else {
        // the leaving paper slides off to the left and fades
        m.position.set(o * 1.9, o * 0.1, -o * 0.2);
        m.rotation.set(0, o * 0.3, -o * 0.12);
        u.uCurl.value = -o * 0.3;
        u.uBend.value = -o * 0.4;
        u.uAlpha.value = 1 + o;
      }
      m.renderOrder = 100 - Math.round(Math.abs(o) * 10);
      m.position.y += o === 0 ? Math.sin(t * 0.0012) * 0.015 : 0;
    });
  });
  go(0);
}
