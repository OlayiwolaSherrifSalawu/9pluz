import type { ImageMetadata } from 'astro';
import postsData from '../data/posts.json';

export interface Block { type: string; text?: string; file?: string; alt?: string }
export interface Post {
  slug: string;
  title: string;
  description: string;
  published: string;
  categories: string[];
  minutes: number | null;
  partner: boolean;
  cover: string;
  coverAlt: string;
  body: Block[] | null;
  sources: { label: string; url: string }[];
}

export const SITE = {
  name: '99Pluz',
  tagline: 'Music PR, culture & media',
  defaultAuthor: 'Chinenye Mbakwe',
  email: 'info@99pluz.com',
  phone: '+44 7303 170351',
  phoneHref: 'tel:+447303170351',
  socials: [
    { label: 'Instagram', href: 'https://www.instagram.com/the99pluz' },
    { label: 'X', href: 'https://x.com/the99pluz' },
    { label: 'YouTube', href: 'https://youtube.com/@the99pluz' },
    { label: 'Facebook', href: 'https://www.facebook.com/share/1CQcYkDnUs/' },
  ],
};

export const NAV = [
  { label: 'Blog', href: '/blog' },
  { label: 'Music PR', href: '/music-pr' },
  { label: 'Brand Strategy', href: '/brand-strategy' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

// Reader-facing category copy (audit: the live descriptions were internal writing notes).
export const CATEGORIES: Record<string, { name: string; description: string }> = {
  culture: { name: 'Culture', description: 'The moments, trends and conversations shaping Nigerian and diaspora culture.' },
  music: { name: 'Music', description: 'New releases, chart moves and artist news from Afrobeats and beyond.' },
  editorial: { name: 'Editorial', description: 'Opinion and analysis from the 99Pluz editorial team.' },
  lifestyle: { name: 'Lifestyle', description: 'Everyday life, money, food and wellbeing, at home and abroad.' },
  industry: { name: 'Industry', description: 'How the music business works: deals, streaming, rollouts and strategy.' },
  politics: { name: 'Politics', description: 'Explainers and fact-checks on the political stories people are sharing.' },
  sports: { name: 'Sports', description: 'Match stories, milestones and the culture around the game.' },
  news: { name: 'News', description: 'What happened, why it matters, and what the viral version left out.' },
  tech: { name: 'Tech', description: 'Technology stories and the tools changing how people create and earn.' },
  relationships: { name: 'Relationships', description: 'Dating, friendship and family, told honestly.' },
  'how-to': { name: 'How-To', description: 'Step-by-step guides for artists, creators and readers.' },
  entertainment: { name: 'Entertainment', description: 'Film, TV, comedy and celebrity news.' },
  business: { name: 'Business', description: 'Brands, founders and the business of culture.' },
  'artist-development': { name: 'Artist Development', description: 'Practical advice for independent artists building a career.' },
  interviews: { name: 'Interviews', description: 'Conversations with artists, creatives and industry voices.' },
};

export const posts: Post[] = (postsData as Post[]).slice().sort((a, b) => b.published.localeCompare(a.published));

export const categoryCounts = posts.reduce<Record<string, number>>((acc, p) => {
  for (const c of p.categories) acc[c] = (acc[c] ?? 0) + 1;
  return acc;
}, {});

// Only show categories with at least 3 posts, biggest first (audit Area 2).
export const visibleCategories = Object.entries(categoryCounts)
  .filter(([slug, n]) => n >= 3 && CATEGORIES[slug])
  .sort((a, b) => b[1] - a[1])
  .map(([slug, count]) => ({ slug, count, ...CATEGORIES[slug] }));

export const categoryName = (slug: string) => CATEGORIES[slug]?.name ?? slug;

const postImages = import.meta.glob<{ default: ImageMetadata }>('../assets/posts/*', { eager: true });
export function postImage(file: string): ImageMetadata {
  const img = postImages[`../assets/posts/${file}`];
  if (!img) throw new Error(`Missing post image ${file}`);
  return img.default;
}

const siteImages = import.meta.glob<{ default: ImageMetadata }>('../assets/site/*', { eager: true });
export function siteImage(file: string): ImageMetadata {
  const img = siteImages[`../assets/site/${file}`];
  if (!img) throw new Error(`Missing site image ${file}`);
  return img.default;
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const PER_PAGE = 16;

export function relatedPosts(post: Post, n = 3) {
  const primary = post.categories[0];
  return posts.filter((p) => p.slug !== post.slug && p.categories.includes(primary)).slice(0, n);
}

// Inline [text](url) links in scraped body text -> safe HTML
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function inlineHtml(text: string) {
  let out = '';
  let last = 0;
  for (const m of text.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g)) {
    out += esc(text.slice(last, m.index));
    const external = m[2].startsWith('http') && !m[2].includes('99pluz.com');
    out += `<a href="${esc(m[2])}"${external ? ' rel="noopener" target="_blank"' : ''}>${esc(m[1])}</a>`;
    last = (m.index ?? 0) + m[0].length;
  }
  return out + esc(text.slice(last));
}
