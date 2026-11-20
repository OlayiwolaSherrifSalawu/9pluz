// Turns scrape/manifest.json into site/src/data/posts.json and copies images into site/src/assets.
// Usage: node scripts/prepare-site.mjs
import { readFile, writeFile, mkdir, copyFile, access } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('.');
const SCRAPE = path.join(ROOT, 'scrape');
const SITE = path.join(ROOT, 'site');

const NAMED = {
  amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  mdash: '—', ndash: '–', hellip: '…', bull: '•', eacute: 'é', egrave: 'è', agrave: 'à', ocirc: 'ô', pound: '£', euro: '€', zwj: '', zwnj: '',
};
const decode = (s) => (s ?? '')
  .replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m)
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/[​⁠⁣﻿]/g, '')
  .trim();

// Posts the live site left without a category.
const CATEGORY_FIXES = [
  [/great-adamz|erigga|grammy/i, 'music'],
  [/stockpile|russia/i, 'news'],
  [/bring-to-the-table|talking-stage/i, 'relationships'],
];

// Client / partner coverage (audit: paid client posts must be labelled). Confirm this list with the 99Pluz team.
const PARTNER_PATTERNS = [/great-adamz/i, /erigga-eeskay/i];

const SITE_IMAGES = {
  '84e48b_9c6e1939fe1145559732364c32a5d71e~mv2.jpg': 'team-chinenye.jpg',
  '84e48b_ee238e70c239490db9fecf6fa1d40fe7~mv2.jpg': 'team-sean.jpg',
  '84e48b_df486db30f144e8a9112924663660dee~mv2.jpeg': 'team-esther.jpg',
  '84e48b_9d298a330a92460fa713749a6757e3fa~mv2.jpeg': 'music-pr.jpg',
  '84e48b_65dcd3b1694a455689917b02c086fed5~mv2.jpeg': 'brand-strategy.jpg',
  '84e48b_cf522dc9dde842ddb55f01d35038667e~mv2.jpeg': 'testimonial-erigga.jpg',
  '84e48b_b042e0b08aed4979b1f333b8e96bbde2~mv2.jpeg': 'testimonial-seyi-law.jpg',
};

// Wix joins paragraphs without a space ("Russia.That is"); keep descriptions to ~2 sentences.
const fixJoins = (s) => s.replace(/([a-z\)][.!?]["”’]?)(?=[A-Z“"])/g, '$1 ');
function summary(s, max = 240) {
  s = fixJoins(s);
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  return end > 80 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, '') + '…';
}

const exists = async (p) => { try { await access(p); return true; } catch { return false; } };
const copyOnce = async (from, to) => { if (!(await exists(to))) await copyFile(from, to); };

const m = JSON.parse(await readFile(path.join(SCRAPE, 'manifest.json'), 'utf8'));
await mkdir(path.join(SITE, 'src/assets/posts'), { recursive: true });
await mkdir(path.join(SITE, 'src/assets/site'), { recursive: true });
await mkdir(path.join(SITE, 'src/data'), { recursive: true });

// id -> file in scrape/images
const idToFile = new Map();
for (const p of m.posts) if (p.image) idToFile.set(p.imageId, p.image);
for (const s of m.siteImages) idToFile.set(s.id, s.file);

const posts = [];
for (const p of m.posts) {
  if (!p.image) continue;
  const cover = path.basename(p.image);
  await copyOnce(path.join(SCRAPE, 'images', p.image), path.join(SITE, 'src/assets/posts', cover));

  let categories = p.categories;
  if (!categories.length) {
    const fix = CATEGORY_FIXES.find(([re]) => re.test(p.slug));
    categories = [fix ? fix[1] : 'culture'];
  }

  let body = null;
  if (p.body) {
    body = [];
    for (const b of p.body) {
      if (b.type === 'img') {
        const src = idToFile.get(b.id);
        if (!src) continue;
        const name = path.basename(src);
        // a body image identical to this post's cover is already the hero
        if (b.id === p.imageId) continue;
        await copyOnce(path.join(SCRAPE, 'images', src), path.join(SITE, 'src/assets/posts', name));
        body.push({ type: 'img', file: name, alt: decode(b.alt) });
      } else {
        body.push({ type: b.type, text: decode(b.text) });
      }
    }
  }

  posts.push({
    slug: p.slug,
    title: decode(p.title),
    description: summary(decode(p.description)),
    published: p.published,
    categories,
    minutes: p.minutesToRead,
    partner: PARTNER_PATTERNS.some((re) => re.test(p.slug)),
    cover,
    coverAlt: decode(p.imageAlt || p.title),
    body,
    sources: [],
  });
}

for (const [id, name] of Object.entries(SITE_IMAGES)) {
  const src = idToFile.get(id);
  if (src) await copyOnce(path.join(SCRAPE, 'images', src), path.join(SITE, 'src/assets/site', name));
  else console.warn('missing site image', id);
}
await copyOnce(path.join(SCRAPE, 'images/site/logo.png'), path.join(SITE, 'src/assets/site/logo.png'));

await writeFile(path.join(SITE, 'src/data/posts.json'), JSON.stringify(posts, null, 1));
const cats = {};
for (const p of posts) for (const c of p.categories) cats[c] = (cats[c] || 0) + 1;
console.log(`${posts.length} posts, ${posts.filter((p) => p.body).length} with full text, ${posts.filter((p) => p.partner).length} partner`);
console.log(cats);
