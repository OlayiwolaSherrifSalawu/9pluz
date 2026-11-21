import {
  Group, Mesh, PlaneGeometry, MeshBasicMaterial, BackSide, FrontSide, DoubleSide, Raycaster, Vector2, RingGeometry, Color,
} from 'three';
import { createStage, reduceMotion } from './core';
import { cardTexture, brushRingTexture, fontsReady, type CardData } from './textures';

interface RingCard extends CardData { href: string }

/** Bend a plane onto a cylinder of radius r so its centre sits at angle 0 (facing +z). */
function bentPlane(w: number, h: number, r: number) {
  const g = new PlaneGeometry(w, h, 24, 1);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const a = x / r;
    pos.setX(i, Math.sin(a) * r);
    pos.setZ(i, Math.cos(a) * r);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

export async function mountRing(el: HTMLElement) {
  const data: RingCard[] = JSON.parse(el.dataset.cards || '[]');
  const stage = createStage(el, 28);
  if (!stage) return;
  const { scene, camera, renderer } = stage;
  await fontsReady();

  const n = data.length;
  const cardW = 1, cardH = 1.4;
  const R = (n * cardW * 1.18) / (Math.PI * 2);
  const world = new Group();
  const ring = new Group();
  world.add(ring);
  scene.add(world);
  world.rotation.set(0.08, 0, -0.17); // seen slightly from above, tilted ~-10° in Z

  const geo = bentPlane(cardW, cardH, R);
  const backMat = new MeshBasicMaterial({ color: new Color('#000'), side: BackSide });
  const fronts: Mesh[] = [];
  const textures = await Promise.all(data.map((d) => cardTexture(d, renderer)));
  data.forEach((d, i) => {
    const holder = new Group();
    holder.rotation.y = (i / n) * Math.PI * 2;
    const front = new Mesh(geo, new MeshBasicMaterial({ map: textures[i], side: FrontSide, transparent: true }));
    front.userData = { href: d.href, i, lift: 0 };
    holder.add(front, new Mesh(geo, backMat));
    ring.add(holder);
    fronts.push(front);
  });

  // brush ellipse: lies around the cylinder, so depth sorting puts it behind back cards and over front ones
  const brush = new Mesh(new RingGeometry(R * 1.12, R * 1.62, 128, 1), new MeshBasicMaterial({ map: brushRingTexture('#000', renderer), transparent: true, alphaTest: 0.25, side: DoubleSide, depthWrite: true }));
  // RingGeometry's default UVs map the outer radius to the texture edge; the stroke sits at ~0.84 of that.
  brush.rotation.x = -Math.PI / 2 + 0.08;
  brush.position.y = -0.05;
  world.add(brush);

  stage.onResize((w, h) => {
    const aspect = w / h;
    const wide = aspect > 1.6;
    const dist = wide ? R * 5.1 : Math.max(R * 4.8, (R * 3.8) / Math.min(1, aspect * 0.8));
    world.position.x = wide ? R * 1.3 : 0;
    camera.position.set(0, R * 0.32, dist);
    camera.lookAt(0, -R * 0.05, 0);
  });

  // interaction: hover lifts a card, click opens its story
  const ray = new Raycaster();
  const mouse = new Vector2(9, 9);
  let hovered: Mesh | null = null;
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  });
  el.addEventListener('pointerleave', () => mouse.set(9, 9));
  el.addEventListener('click', () => { if (hovered) location.href = hovered.userData.href; });

  let speed = 0.00012;
  stage.loop((_, dt) => {
    const s = (window as any).__scroll;
    const target = hovered ? 0.00002 : 0.00012 + (s ? Math.abs(s.v) * 0.0009 : 0);
    speed += (target - speed) * 0.05;
    if (!reduceMotion) ring.rotation.y += speed * dt * (s && s.dir === -1 ? -1 : 1);

    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(fronts, false)[0]?.object as Mesh | undefined;
    hovered = hit ?? null;
    el.style.cursor = hovered ? 'pointer' : '';
    for (const f of fronts) {
      const want = f === hovered ? 1 : 0;
      f.userData.lift += (want - f.userData.lift) * 0.12;
      f.position.y = f.userData.lift * 0.12;
      f.scale.setScalar(1 + f.userData.lift * 0.04);
    }
  });
}
