import { Mesh, PlaneGeometry, MeshBasicMaterial, Group, DoubleSide } from 'three';
import { createStage, scrollProgress as viewProgress, reduceMotion } from './core';
import { cardTexture, teamScreenTexture, fontsReady, type CardData } from './textures';

function bend(g: PlaneGeometry, amount: number) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, -amount * x * x); }
  p.needsUpdate = true;
  return g;
}

/** Two story cards that rise through the wordmark, tilted ±20°, with scroll parallax (spec §6.4 §2) */
export async function mountRise(el: HTMLElement) {
  const data: CardData[] = JSON.parse(el.dataset.cards || '[]');
  const stage = createStage(el, 30);
  if (!stage) return;
  const { scene, camera, renderer } = stage;
  await fontsReady();
  const tex = await Promise.all(data.map((d) => cardTexture(d, renderer)));
  const geo = bend(new PlaneGeometry(1, 1.4, 16, 1), 0.06);
  const cards = tex.map((t, i) => {
    const m = new Mesh(geo, new MeshBasicMaterial({ map: t, side: DoubleSide, transparent: true }));
    scene.add(m);
    m.userData.side = i === 0 ? -1 : 1;
    return m;
  });
  stage.onResize((w, h) => {
    camera.position.set(0, 0, w / h < 0.9 ? 6.5 : 4.8);
  });
  stage.loop((t) => {
    const p = viewProgress(el);
    const idle = reduceMotion ? 0 : t * 0.001;
    cards.forEach((m, i) => {
      const s = m.userData.side;
      const aspect = stage.width / stage.height;
      const spread = aspect < 0.9 ? 0.55 : 1.15;
      m.position.x = s * spread;
      m.position.y = (0.55 - p) * (i === 0 ? 4.2 : 3.2) + Math.sin(idle + i) * 0.05;
      m.position.z = i === 0 ? -0.3 : 0.2;
      m.rotation.z = s * -0.35 + Math.sin(idle * 0.7 + i) * 0.03;
      m.rotation.y = s * 0.25 + (p - 0.5) * 0.4 * s;
      m.rotation.x = 0.12;
    });
  });
}

/** Tilted "app screen" of the team that straightens as you scroll (spec §6.4 §6) */
export async function mountScreen(el: HTMLElement) {
  const people = JSON.parse(el.dataset.people || '[]');
  const stage = createStage(el, 30);
  if (!stage) return;
  const { scene, camera, renderer } = stage;
  await fontsReady();
  const tex = await teamScreenTexture(people, renderer);
  const W = 2.1, H = W * (900 / 1400);
  const geo = new PlaneGeometry(W, H, 32, 1);
  const mesh = new Mesh(geo, new MeshBasicMaterial({ map: tex, side: DoubleSide }));
  const group = new Group();
  group.add(mesh);
  scene.add(group);
  stage.onResize((w, h) => { camera.position.set(0, 0, w / h < 0.9 ? 6 : 4.2); });
  const base = geo.attributes.position.array.slice();
  stage.loop((t) => {
    const p = viewProgress(el);
    const k = Math.min(1, Math.max(0, (p - 0.1) / 0.55)); // 0 tilted -> 1 flat
    const flat = reduceMotion ? 1 : k;
    group.rotation.x = (1 - flat) * 0.18;
    group.rotation.y = (1 - flat) * -0.26;
    group.rotation.z = (1 - flat) * 0.03;
    group.position.y = (1 - flat) * -1.1 - 0.1 + Math.sin(t * 0.001) * 0.01;
    const bendAmt = (1 - flat) * 0.08;
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const x = base[i * 3]; pos.setZ(i, -bendAmt * x * x); }
    pos.needsUpdate = true;
  });
}
