// Mount every WebGL scene on the page. Three.js is only loaded on pages that have one.
const scenes: Record<string, () => Promise<(el: HTMLElement) => Promise<void>>> = {
  ring: () => import('./ring').then((m) => m.mountRing),
  papers: () => import('./papers').then((m) => m.mountPapers),
  rise: () => import('./planes').then((m) => m.mountRise),
  screen: () => import('./planes').then((m) => m.mountScreen),
};
document.querySelectorAll<HTMLElement>('[data-gl]').forEach(async (el) => {
  const load = scenes[el.dataset.gl!];
  if (!load) return;
  try { (await load())(el); } catch (e) { console.warn('WebGL scene failed', e); el.classList.add('gl--fallback'); }
});
