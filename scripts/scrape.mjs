// Scrapes 99pluz.com: post metadata + cover images, core-page images and copy.
// Usage: node scripts/scrape.mjs   (writes to ./scrape)
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

const BASE = 'https://www.99pluz.com';
const OUT = path.resolve('scrape');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const FULLTEXT_COUNT = 6;

const CORE_PAGES = {
  home: '/',
  blog: '/blog',
  about: '/about-3',
  'music-pr': '/services-2',
  'brand-strategy': '/copy-of-services',
  contact: '/contact-7',
  careers: '/coming-soon-01',
  privacy: '/s-projects-side-by-side',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, { binary = false, tries = 3 } = {}) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return binary ? Buffer.from(await res.arrayBuffer()) : await res.text();
    } catch (e) {
      if (i === tries) { console.warn(`  ! ${url}: ${e.message}`); return null; }
      await sleep(800 * i);
    }
  }
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
}

const decode = (s = '') => s
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
const stripTags = (s) => decode(s.replace(/<br[^>]*>/g, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t]+/g, ' ').trim();
const meta = (html, key) => {
  const m = html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`));
  return m ? decode(m[1]) : null;
};

// Wix media id like "d92851_84d2...~mv2.jpg" -> original URL
const MEDIA_RE = /static\.wixstatic\.com\/media\/([0-9a-f]{6}_[0-9a-f]{32}(?:~|%7E)mv2\.(?:png|jpe?g|webp|gif))/gi;
const normId = (id) => id.replace(/%7E/i, '~');
const originalUrl = (id) => `https://static.wixstatic.com/media/${id}`;

function postCategories(html) {
  const counts = {};
  for (const m of html.matchAll(/\/blog\/categories\/([a-z0-9-]+)/g)) counts[m[1]] = (counts[m[1]] || 0) + 1;
  // Every category appears once in the menu; the post's own categories appear again.
  return Object.entries(counts).filter(([, c]) => c >= 2).map(([k]) => k);
}

function postBody(html) {
  const start = html.indexOf('data-hook="rcv-block-first"');
  const end = html.indexOf('data-hook="rcv-block-last"');
  if (start < 0 || end < 0) return null;
  const chunk = html.slice(start, end);
  const blocks = [];
  const re = /<(p|h[1-6]|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>|<img\b[^>]*>/g;
  for (const m of chunk.matchAll(re)) {
    if (!m[1]) {
      const id = m[0].match(/media\/([0-9a-f]{6}_[0-9a-f]{32}~mv2\.\w+)/i);
      const alt = m[0].match(/alt="([^"]*)"/);
      if (id) blocks.push({ type: 'img', id: id[1], alt: alt ? decode(alt[1]) : '' });
      continue;
    }
    // keep links as markdown
    const inner = m[2].replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, (_, href, t) => `[${stripTags(t)}](${decode(href)})`);
    const text = stripTags(inner);
    if (!text) continue;
    const type = m[1] === 'p' ? 'p' : m[1];
    blocks.push({ type, text });
  }
  return blocks;
}

function pageCopy(html) {
  // Visible rich-text blocks from Wix pages, in document order.
  const lines = [];
  for (const m of html.matchAll(/<(h[1-6]|p|li)\b[^>]*class="[^"]*(?:font_\d|wixui-rich-text__text)[^"]*"[^>]*>([\s\S]*?)<\/\1>/g)) {
    const t = stripTags(m[2]);
    if (t && lines[lines.length - 1] !== t) lines.push(`${m[1].startsWith('h') ? '#'.repeat(+m[1][1]) + ' ' : ''}${t}`);
  }
  return lines.join('\n\n');
}

function pageImages(html) {
  const found = new Map();
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    const id = m[0].match(/media\/([0-9a-f]{6}_[0-9a-f]{32}(?:~|%7E)mv2\.\w+)/i);
    if (!id) continue;
    const alt = m[0].match(/alt="([^"]*)"/);
    const k = normId(id[1]);
    if (!found.has(k) || (!found.get(k) && alt?.[1])) found.set(k, alt ? decode(alt[1]) : '');
  }
  for (const m of html.matchAll(MEDIA_RE)) { const k = normId(m[1]); if (!found.has(k)) found.set(k, ''); }
  return found;
}

async function exists(p) { try { await access(p); return true; } catch { return false; } }

async function download(id, file) {
  if (await exists(file)) return true;
  const buf = await get(originalUrl(id), { binary: true });
  if (!buf) return false;
  await writeFile(file, buf);
  return true;
}

async function main() {
  await mkdir(path.join(OUT, 'images/posts'), { recursive: true });
  await mkdir(path.join(OUT, 'images/site'), { recursive: true });
  await mkdir(path.join(OUT, 'pages'), { recursive: true });

  // 1. Sitemap
  console.log('Reading posts sitemap…');
  const sm = await get(`${BASE}/blog-posts-sitemap.xml`);
  const entries = [...sm.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, u]) => {
    const loc = u.match(/<loc>([^<]+)/)?.[1];
    const img = u.match(/<image:loc>([^<]+)/)?.[1];
    const imgTitle = u.match(/<image:title>([^<]+)/)?.[1];
    return {
      slug: loc.split('/post/')[1],
      lastmod: u.match(/<lastmod>([^<]+)/)?.[1] ?? null,
      imageId: img ? normId(img.split('/media/')[1]) : null,
      imageTitle: imgTitle ? decode(imgTitle) : null,
    };
  }).filter((e) => e.slug);
  console.log(`  ${entries.length} posts`);

  // 2. Post pages (metadata; full text kept for all, trimmed later to newest N)
  console.log('Fetching post pages…');
  let done = 0;
  const posts = await pool(entries, 6, async (e) => {
    const html = await get(`${BASE}/post/${e.slug}`);
    if (++done % 25 === 0) console.log(`  ${done}/${entries.length}`);
    if (!html) return { ...e, error: true };
    let ld = {};
    const ldm = html.match(/<script type="application\/ld\+json">(\{"@context":"https:\/\/schema\.org","@type":"BlogPosting"[\s\S]*?)<\/script>/);
    if (ldm) { try { ld = JSON.parse(ldm[1]); } catch {} }
    const og = meta(html, 'og:image');
    const ogId = og?.match(/media\/([0-9a-f]{6}_[0-9a-f]{32}(?:~|%7E)mv2\.\w+)/i)?.[1];
    const minutes = html.match(/data-hook="time-to-read"[^>]*>(?:<[^>]+>)*\s*(\d+)/)?.[1];
    return {
      slug: e.slug,
      title: meta(html, 'og:title') ?? ld.headline ?? e.imageTitle ?? e.slug,
      description: meta(html, 'og:description') ?? meta(html, 'description') ?? '',
      published: meta(html, 'article:published_time') ?? ld.datePublished ?? e.lastmod,
      modified: meta(html, 'article:modified_time') ?? e.lastmod,
      author: meta(html, 'article:author') ?? ld.author?.name ?? null,
      categories: postCategories(html),
      minutesToRead: minutes ? +minutes : null,
      imageId: e.imageId ?? (ogId ? normId(ogId) : null),
      imageAlt: e.imageTitle ?? meta(html, 'og:title') ?? '',
      body: postBody(html),
    };
  });

  posts.sort((a, b) => (b.published ?? '').localeCompare(a.published ?? ''));
  posts.forEach((p, i) => { if (i >= FULLTEXT_COUNT) delete p.body; });

  // 3. Core pages: copy + images
  console.log('Fetching core pages…');
  const siteImages = new Map(); // id -> {alt, pages:[]}
  for (const [name, p] of Object.entries(CORE_PAGES)) {
    const html = await get(BASE + p);
    if (!html) continue;
    await writeFile(path.join(OUT, 'pages', `${name}.md`), `<!-- source: ${BASE + p} -->\n\n` + pageCopy(html));
    for (const [id, alt] of pageImages(html)) {
      const cur = siteImages.get(id) ?? { alt: '', pages: [] };
      if (!cur.alt && alt) cur.alt = alt;
      cur.pages.push(name);
      siteImages.set(id, cur);
    }
  }
  // newest-post body images belong with posts
  const bodyImageIds = new Set(posts.flatMap((p) => (p.body ?? []).filter((b) => b.type === 'img').map((b) => b.id)));

  // 4. Downloads
  console.log('Downloading post covers…');
  const coverIds = new Set();
  await pool(posts.filter((p) => p.imageId), 6, async (p) => {
    const ext = p.imageId.split('.').pop().replace('jpeg', 'jpg');
    const file = `posts/${p.slug}.${ext}`;
    if (await download(p.imageId, path.join(OUT, 'images', file))) p.image = file;
    coverIds.add(p.imageId);
  });
  console.log('Downloading site + inline images…');
  const site = [];
  const toGet = [...siteImages.entries()].filter(([id]) => !coverIds.has(id));
  for (const id of bodyImageIds) if (!siteImages.has(id) && !coverIds.has(id)) toGet.push([id, { alt: '', pages: ['post-body'] }]);
  await pool(toGet, 6, async ([id, info]) => {
    const file = `site/${id.replace('~', '-')}`;
    if (await download(id, path.join(OUT, 'images', file))) site.push({ id, file, alt: info.alt, pages: info.pages });
  });

  const categories = {};
  for (const p of posts) for (const c of p.categories) categories[c] = (categories[c] || 0) + 1;

  await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify({
    scrapedAt: new Date().toISOString(),
    source: BASE,
    counts: { posts: posts.length, covers: posts.filter((p) => p.image).length, siteImages: site.length },
    categories,
    posts,
    siteImages: site.sort((a, b) => a.id.localeCompare(b.id)),
  }, null, 2));
  console.log(`Done: ${posts.length} posts, ${posts.filter((p) => p.image).length} covers, ${site.length} site images.`);
  console.log('Categories:', categories);
}

main().catch((e) => { console.error(e); process.exit(1); });
