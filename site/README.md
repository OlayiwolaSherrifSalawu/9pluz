# 99Pluz website

Static Astro site rebuilding 99pluz.com in a FOLLOW.ART-inspired style (see `../follow-art-design-reference.md`), with the fixes from `../99pluz-blog-audit.md`.

## Run

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # outputs dist/ (≈350 pages, first build ~3 min while images are optimised)
npm run preview
```

## Content pipeline

```sh
node scripts/scrape.mjs        # from repo root: re-scrape 99pluz.com into scrape/
node scripts/prepare-site.mjs  # turn scrape/manifest.json into src/data/posts.json + src/assets
```

- `src/data/posts.json`: 300 posts (title, date, category, summary, cover). Full text only for the 6 newest.
- `src/lib/content.ts`: page copy (services, testimonials, team, playlists, roles).
- `src/lib/site.ts`: nav, contact details, category names and reader-facing descriptions.
- Client posts are flagged by `PARTNER_PATTERNS` in `scripts/prepare-site.mjs`.

## Design system

- Colours (kept from the live site): orange `#ec8835` for fills, black `#0d0d0d` base, navy `#112a78`, grey `#4a4a4a`, paper `#f6f3ee` for reading. Orange text on light backgrounds uses `#a34f0f`.
- Fonts: Anton (headlines), Inter Tight (everything else), self-hosted via Fontsource.
- Panels (`components/Panel.astro`) stack and tilt as you scroll (`scripts/motion.ts`). Doodles in `components/Doodle.astro` are original SVGs.
- All motion is off under `prefers-reduced-motion`.

## Before launch

- [ ] Migrate full text for the other 294 posts (Wix blog export). Until then those pages show the summary and link to the live post.
- [ ] Choose a form service. Forms currently open the visitor's email app (`components/ContactForm.astro`, `Newsletter.astro`).
- [ ] Confirm the client/partner list, the Careers role summaries and the team photo ↔ name pairing.
- [ ] Add sources to news and fact-check posts (`sources` field in posts.json renders a Sources list).
- [ ] Host somewhere that turns the `redirects` in `astro.config.mjs` into real 301s (Netlify, Vercel or Cloudflare Pages).
