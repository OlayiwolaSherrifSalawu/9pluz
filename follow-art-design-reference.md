# FOLLOW.ART — Design Reference

Teardown of https://follow.art/ (homepage + 404), captured 2026-11-20.
Use as inspiration only: the fonts are commercial, and the photos, logo and copy belong to FOLLOW.ART. Don't copy their files.

---

## 1. Tech stack

| Layer | What they use |
|---|---|
| Framework | Nuxt 3 (Vue 3), server-rendered |
| Images | Nuxt Image (`_ipx`) serves AVIF at 768×768 and SVGs for decorations |
| 3D / WebGL | Three.js r176, with 5 canvases on the homepage |
| Smooth scroll | Lenis 1.3.3, inside a custom scroll container (`Scrollable` + `Scrollbar` components) |
| Animation | Hand-written JS and CSS transitions (no GSAP) |
| Build credit | "Digital product development by Vide Infra" |

---

## 2. Typography

| Role | Font | Weight | Notes |
|---|---|---|---|
| Everything (UI, body, giant headlines) | **HeadingNow 73 Book** | 400 | Very condensed grotesk; used on about 95% of elements |
| Accent display | **Hardbop Bold** | 700 | Used sparingly (19 elements) |
| Fallback | Helvetica, Arial, sans-serif | | |

```css
@font-face {
  font-family: HeadingNow;
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  src: url(/fonts/HeadingNow-73Book.woff2) format("woff2"),
       url(/fonts/HeadingNow-73Book.woff) format("woff");
}
@font-face {
  font-family: Hardbop;
  font-weight: 700;
  font-style: normal;
  font-display: swap;
  src: url(/fonts/Hardbop-Bold.woff2) format("woff2"),
       url(/fonts/Hardbop-Bold.woff) format("woff");
}
body { font-family: HeadingNow, Helvetica, Arial, sans-serif; }
```

The type works by contrast of scale:
- **Section titles** are huge, black and full-bleed: THE CARD, CENTRALIZE, AUDIENCE SUPPORT, TESTIMONIALS, CONNECTORY, JOIN. They are often taller than the viewport, with tight leading, and some are cropped by the panel edge.
- **Body text** is light and roughly 26–30px at 1440 wide, white on color, set in short 2–4 line blocks.
- **The header** uses small 13px type: "FOLLOW. ART" with the tagline "Your creative practice, centralized" in 60% white underneath.

Free alternatives with a similar feel: *Bebas Neue* or *Anton* for the condensed headlines, and *Inter Tight* or *Manrope* for body text.

---

## 3. Color

```css
:root {
  /* brand */
  --c-orange: #f4793a;   /* hero + Join section bg, theme-color */
  --c-black:  #000;      /* headlines, cards, Join CTA */
  --c-white:  #fff;      /* body text on color */

  /* muted section backgrounds */
  --c-green:  #8e9487;   /* sage */
  --c-pink:   #c5939d;   /* dusty rose */
  --c-blue:   #8498ac;   /* slate blue */

  /* neutrals */
  --c-grey:   #9c9c9c;
  --c-gray-popup-bg: rgba(80, 80, 80, .5);
  --c-error:  #ea1b4f;

  /* white alphas */
  --c-white-10: hsla(0, 0%, 100%, .1);
  --c-white-20: hsla(0, 0%, 100%, .2);
  --c-white-30: hsla(0, 0%, 100%, .3);
  --c-white-60: hsla(0, 0%, 100%, .6);

  /* black alphas */
  --c-black-3:  rgba(0, 0, 0, .03);
  --c-black-15: rgba(0, 0, 0, .15);
  --c-black-20: rgba(0, 0, 0, .2);
  --c-black-60: rgba(0, 0, 0, .6);
}
```

They also keep an `-rgb` triplet for each color (for example `--c-orange-rgb: 244,121,58`), so alpha can be applied with `rgba(var(--c-orange-rgb), .5)`. Theme tokens (`--t-background`, `--t-heading`, …) map onto the `--c-*` colors.

**Section color order (top to bottom):**
orange → sage → pink → sage → pink → blue → sage → orange (+ footer).

**Rules:** black and white only on top of the color. No gradients and no shadows. The muted pastel colors carry the mood, and the orange appears only at the start and the end.

---

## 4. Spacing and scale system

Everything is sized from a single fluid unit that equals 1px at a 1440px viewport:

```css
:root {
  --scale-px: clamp(.5px, .06944vw, 1px);   /* 1440 × .06944vw ≈ 1px */

  --spacing:            calc(var(--scale-px) * 30);   /* desktop; 20 on small screens */
  --spacing-small:      calc(var(--scale-px) * 15);
  --spacing-tiny:       calc(var(--scale-px) * 5);
  --spacing-header:     calc(var(--scale-px) * 50);   /* 40 on small screens */
  --spacing-grid-gutter:calc(var(--scale-px) * 20);   /* 10 on small screens */
}
/* usage */
.title { font-size: calc(var(--scale-px) * 300); }
```

They switch breakpoints with a "space toggle" trick: `--md: ;` versus `--md: initial`, so `var(--md, A) var(--n-md, B)` resolves to A or B without separate media queries for every property.

**Grid:** a 2-column split at 50%, divided by a 1px vertical line in `--c-white-30`. A horizontal 1px rule sits above each text row. The page gutter is about 18px.

---

## 5. Layout signature: tilted stacked panels

Each section is a full-viewport colored panel that **slides up over the previous one while slightly rotated** (about 2–4°). The panel's angled top edge cuts across the section below, and it straightens out as it settles. Components involved: `Section`, `SectionLayer`, `Sticky`.

Recreate:
```css
.section {
  position: sticky; top: 0;
  min-height: 100vh;
  transform-origin: left top;
  transform: rotate(var(--tilt, 0deg));
  transition: transform .9s cubic-bezier(.25,.74,.22,.99);
}
/* JS: map each section's enter progress p (0→1) to --tilt: (1-p) * -3deg */
```

**Persistent UI:**
- **Header:** fixed and transparent, with a 1px bottom border in white at 30%. Logo and tagline on the left, centered nav (About · Our Product · Community Board · Pricing · FAQ), and Login · Join on the right.
- **Floating CTA:** a black box of about 200×74px, fixed bottom-right, with "Join" bottom-left and a circled arrow (→) top-right.
- **Custom scrollbar:** a thin vertical line on the right edge.

---

## 6. Hand-drawn decoration layer

White (sometimes black) brush-stroke SVGs overlap each headline. They give an analog feel that offsets the strict grid.

| Asset | Where |
|---|---|
| `star.svg` ✦ | Next to CENTRALIZE and HEY CREATIVES |
| `$` scribble | Through the P in SUPPORT |
| `speech-balloon.svg` | Over TESTIMONIALS |
| `us-word.svg` "Us" script | Next to JOIN |
| `cross.svg` big X | Over "NOT" on the 404 page |
| `promo-arrow.svg`, `line.svg`, `loop-arrows.svg` | Pointing at CTAs |
| `vortex.svg`, `flower.svg`, `helix-decoration.svg`, `emoji-smile.svg`, `the.svg` | Scattered accents |
| Orange paint swooshes | Behind the black benefit cards |

All are in `/images/landing/common/` (plus section folders).

---

## 7. Motion

**Easing curves**
```css
--ease-in-out: cubic-bezier(.55, 0, .1, 1);    /* strong in-out, used for panel/page moves */
--ease-out:    cubic-bezier(.25, .74, .22, .99); /* soft expo-out, used for reveals */
```

**CSS keyframes**
```css
@keyframes loop-carousel-animation {        /* endless supporter-name marquee */
  0%   { transform: translate(-100%); }
  to   { transform: translate(0); }
}
@keyframes changingElements {               /* items blink in sequence */
  0% { opacity: 0 } 10% { opacity: 1 } 20% { opacity: 0 } to { opacity: 0 }
}
@keyframes icon-next-animation {            /* "next" arrow nudge on hover */
  33.33% { transform: rotate(-5deg) }
  66.66% { transform: rotate(-10deg) }
}
@keyframes spinner {
  0%  { transform: translate(-50%,-50%) rotate(0) }
  to  { transform: translate(-50%,-50%) rotate(1turn) }
}
```

**Interactive / WebGL pieces**

| Section | Effect | How it's built |
|---|---|---|
| 1 Hero | A ring of black artist cards curving through the giant "FOLLOW.ART" headline and moving along the curve as you scroll | Three.js curve-following setup (`spineTexture`, `pathOffset`, `spineLength`, `flow` uniforms) |
| 2 How it works | A video preview with an image revealed in a circle around the cursor | Shader uniforms `mousePos`, `radius`, `progressStart/End` |
| 3–6 | Black numbered benefit cards (1–4) on orange paint swooshes | `Landing6BenefitsWebGl` |
| 5 Nexus | A 3D card intro | `NexusCardIntroWebGl`, `NexusCardYourCardWebGl` |
| 7 Connectory | Card tiles inside the giant CONNECTORY letters | `Landing7ConnectoryWebGl` |
| 8 Audience support | An endless marquee of supporter names and roles (the list is duplicated so it loops) | CSS `loop-carousel-animation` |
| 9 Testimonials | Paper-like testimonial cards curling in 3D that you can drag, plus Prev/Next buttons | `dragstart/dragmove/dragend` |
| 10 Join us | **Cursor image trail:** moving over the JOIN letters stamps member portraits (18 images) | `ImageTrail` component |
| Links | Underline animates on hover | `TextUnderlineAnimation` |
| Titles | Headline reveal | `TitleAnimation` |

---

## 8. Easter egg findings

I searched the whole JS bundle (139 files) for key sequences, click counters, console messages and hidden components, and **found none**. The playful hidden-ish moments are:

1. **404 page:** "PAGE NOT FOUND" in giant black type with a white brush X over "NOT", plus a "Go to homepage" black CTA (visit any bad URL).
2. **Cursor image trail** in JOIN US.
3. **Mouse-reveal shader** on the "How it works" video.
4. **Draggable 3D testimonials.**

---

## 9. Image inventory

```
/images/landing/common/      line, star, vortex, emoji-smile, flower, loop-arrows,
                             helix-decoration, the, promo-arrow  (.svg)
/images/landing/4.follow-art/cross.svg
/images/landing/9.testimonials/speech-balloon.svg
/images/landing/10.join-us/  us-word.svg, trail-1 … trail-18.png
/images/landing/team/        person-1 … person-10.jpg
/images/common/              media-play.svg, usd-currency.svg
/manifest/                   og.png, og-twitter.png
```

---

## 10. Recipe: getting the look

1. Pick one loud brand color (theirs is orange) and three muted pastels for the middle sections.
2. Use one condensed grotesk for everything. Make headlines very large (bigger than the viewport is fine), black, with tight leading.
3. Use white text on color, with 1px lines at 30% white for structure. No shadows, rounded corners or gradients.
4. Add hand-drawn white brush SVGs on top of the headlines.
5. Stack the sections as sticky, slightly rotated panels that straighten as they settle.
6. Keep one fixed black CTA box in the bottom-right corner.
7. Use one signature interaction per section: a curved card carousel, a cursor reveal, an image trail, draggable cards.
8. Use Lenis for smooth scroll, and size everything from a single fluid `--scale-px` unit.
