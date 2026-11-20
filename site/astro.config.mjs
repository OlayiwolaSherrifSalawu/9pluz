import { defineConfig } from 'astro/config';

// Old Wix addresses -> clean URLs (audit Area 2). Static builds emit redirect pages;
// on Netlify/Vercel/Cloudflare these become real 301s.
export default defineConfig({
  site: 'https://www.99pluz.com',
  trailingSlash: 'never',
  build: { format: 'file' },
  redirects: {
    '/about-3': '/about',
    '/services-2': '/music-pr',
    '/copy-of-services': '/brand-strategy',
    '/contact-7': '/contact',
    '/coming-soon-01': '/careers',
    '/s-projects-side-by-side': '/privacy-policy',
    '/s-projects-basic-1': '/music-pr',
    '/about-4': '/careers',
    '/inquiry-services-page': '/contact',
    '/copy-of-press-media-features': '/music-pr',
    '/copy-of-press-media-features-1': '/brand-strategy',
    '/copy-of-press-media-features-2': '/music-pr',
    '/copy-of-events-coverage': '/brand-strategy',
    '/copy-of-events-coverage-1': '/brand-strategy',
    '/copy-of-events-coverage-2': '/brand-strategy',
    '/copy-of-brand-events-coverage': '/brand-strategy',
    '/copy-of-ads-content-creation': '/brand-strategy',
    '/copy-of-brand-press-media-page': '/brand-strategy',
    '/copy-of-editorial-playlist-recommenda': '/music-pr',
    '/copy-of-blog-writer-page': '/careers',
  },
});
