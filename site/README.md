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

## Design system (follow-art-design-spec.md)

- Palette: 99Pluz orange `#ec8835` + black as the brand; sage `#8e9487`, pink `#c5939d`, slate blue `#8498ac` as section colours. Body text is white on every colour (a deliberate choice; it is below 4.5:1 contrast). Long-form reading uses paper `#f6f3ee` with black text.
- Type: Anton (display, uppercase), Archivo Variable at 112% width / 350 weight (text), Caveat Brush for script doodle words. Sizes come from `--R` (10px, scaling down between 980–1439px), following the spec's type scale.
- Sheets (`components/Panel.astro`): each section slides over the last, tilted `15·p²` degrees from the top-left, flattening as it lands (`scripts/motion.ts`). The header takes the colour of the section under it.
- Loader: ten doodles flash in stop-motion on the first visit per session. Intro: wordmark unfolds, the ring swings in after 1s.
- WebGL (`scripts/gl/`, three@0.170.0, homepage only): story-card ring with brush ellipse, cards rising through "THE BLOG", curling testimonial papers, tilted team screen. Each `[data-gl]` element has a DOM fallback shown when WebGL is unavailable.
- Hover vocabulary: Y-axis flip cards, marquee pause with siblings dimmed, orange brush accent behind button labels, underline wipe, ticking arrows.
- Reduced motion turns off the loader, sheets tilt, ring rotation, marquees and reveals.

## Before launch

- [ ] Migrate full text for the other 294 posts (Wix blog export). Until then those pages show the summary and link to the live post.
- [ ] Choose a form service. Forms currently open the visitor's email app (`components/ContactForm.astro`, `Newsletter.astro`).
- [ ] Confirm the client/partner list, the Careers role summaries and the team photo ↔ name pairing.
- [ ] Add sources to news and fact-check posts (`sources` field in posts.json renders a Sources list).
- [ ] Host somewhere that turns the `redirects` in `astro.config.mjs` into real 301s (Netlify, Vercel or Cloudflare Pages).
