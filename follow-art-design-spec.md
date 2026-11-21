# FOLLOW.ART — Landing Page Design & Motion Spec

> Reverse-engineered from the live site `https://follow.art/` (captured 2026-11-21 at a 1054×748 desktop viewport, DPR 2).
> Purpose: give a designer, developer or code model enough detail to rebuild the page with the same look, type, layout and motion.
> Values marked **(measured)** come from the live CSS or computed styles. Values marked **(observed)** come from frame-by-frame screenshots and may be approximate.

---

## 1. Design direction

**Editorial-brutalist, art-zine feel.** Every section is one flat, muted colour. Huge condensed all-caps black headlines fill the full width. Small, light, wide-grotesk body copy sits in white. Hand-drawn white or black doodles (sparkles, stars, a dollar sign, ovals, script words) are slapped on top of the headlines. Black product "cards" float in 3D (WebGL).

Principles:
1. **One colour per section.** No gradients, shadows or rounded corners. Everything is flat and square-cornered.
2. **Scale contrast is the whole show.** Display type runs ~160–380px; body copy ~11–22px. Nothing sits in between.
3. **Sections are physical sheets of paper.** Each new section slides up *over* the previous one, starting tilted ~15° and settling flat (see §6.2).
4. **Hand-made accents on a rigid grid.** The 12-column grid has a hairline vertical divider at 50% and hairline horizontal rules. Scribbles and brush strokes deliberately break it.
5. **Motion is slow and heavy.** The main easing is `cubic-bezier(0.55, 0, 0.1, 1)` over 0.8–1.5s. Hover micro-interactions are quicker, using `cubic-bezier(0.25, 0.74, 0.22, 0.99)` over 0.3s.

---

## 2. Tech stack (detected)

| Layer | Implementation |
|---|---|
| Framework | **Nuxt 3** (Vue), `#__nuxt`, component-scoped CSS chunks (`Landing1IntroWebGl`, `Landing2GetSeenWebGl`, `Landing5NexusWebGl`, `Landing7ConnectoryWebGl`, `Landing9TestimonialsWebGl`, `Landing10JoinUs`, `TextUnderlineAnimation`, …) |
| Smooth scroll | **Lenis**, applied to an inner scroll container (`.scrollable__area.lenis`), not the window. The body itself never scrolls. |
| 3D | Raw **WebGL `<canvas>`** per section (6 canvases; no global THREE/GSAP exposed). Each canvas renders DOM-like textured planes: cards, screenshots, testimonial papers. |
| Breakpoints | CSS **"space-toggle"** custom properties (`--md`, `--n-md`, …) set inside `@media` on `:root` (see §4) |
| CSS layers | `@layer reset, base, utilities, components-base, components, overrides;` |
| Theme colour | `<meta name="theme-color" content="#8E9487">` |

---

## 3. Colour system (measured)

### 3.1 Raw palette

| Token | Hex | Use |
|---|---|---|
| `--c-orange` | `#F4793A` | Hero and Join sections, brand accent, brush strokes |
| `--c-green` | `#8E9487` | Sage / olive grey sections (Get Seen, Centralize, Connectory) |
| `--c-pink` | `#C5939D` | Dusty rose sections (The Card, Audience Support) |
| `--c-blue` | `#8498AC` | Slate blue section (Testimonials) |
| `--c-black` | `#000000` | Headlines, cards, buttons |
| `--c-white` | `#FFFFFF` | Body text, doodles |
| `--c-grey` | `#9C9C9C` | Small / disabled text on white |
| `--c-error` | `#EA1B4F` | Form errors |
| `--c-white-10/20/30/60` | `hsla(0,0%,100%,.1/.2/.3/.6)` | Lines and secondary text on colour |
| `--c-black-3/15/20/60` | `rgba(0,0,0,.03/.15/.2/.6)` | Lines on white UI |
| `--c-gray-popup-bg` | `rgba(80,80,80,.5)` | Modal scrim |

Each colour also has an `-rgb` triplet twin (e.g. `--c-orange-rgb: 244,121,58`) for use in `rgba(var(--x-rgb), a)`.

### 3.2 Semantic theme tokens

Every section carries a theme class that remaps the `--t-*` tokens:

```css
.ui-orange { --t-background:#F4793A; }
.ui-green  { --t-background:#8E9487; }
.ui-pink   { --t-background:#C5939D; }
.ui-blue   { --t-background:#8498AC; }

/* shared by all four coloured themes (measured) */
[class*="ui-"] {
  --t-text:    #FFFFFF;                 /* body copy */
  --t-heading: #000000;                 /* giant headlines */
  --t-line:    hsla(0,0%,100%,.3);      /* hairline rules */
  --t-small:   hsla(0,0%,100%,.6);      /* captions */
  --t-accent:  #000000;
}
/* default (white UI, e.g. app pages) */
:root {
  --t-background: #fff; --t-text:#000; --t-heading:#000;
  --t-line: rgba(0,0,0,.15); --t-line-thin: rgba(0,0,0,.2);
  --t-small:#9C9C9C; --t-primary:#F4793A; --t-accent:#F4793A;
  --t-skeleton: rgba(var(--t-heading-rgb),.07);
  --t-skeleton-shimmer: rgba(var(--t-background-rgb),.5);
}
```

Button tokens: primary is **black background, white text, orange accent**. Secondary is white background, black text, orange accent.

### 3.3 Section colour sequence

| # | Section | Theme |
|---|---|---|
| 0 | Intro / Hero — "FOLLOW.ART" | orange |
| 1 | Get Seen — "HEY CREATIVES" | green |
| 2 | The Card — "THE CARD" | pink |
| 3 | Centralize — "CENTRALIZE" | green |
| 4 | Audience Support | pink |
| 5 | Testimonials | blue |
| 6 | The Connectory | green |
| 7 | Join Us + footer | orange |

The fixed header's background always matches the section currently under it. It uses a `.promo-header__previous-bg` layer plus `transition: background .4s`.

---

## 4. Responsive system

### 4.1 Root scale

```css
html { font-size: 10px; }                 /* so 1rem = 10px */
:root {
  --scale-text-rem: 1rem;                 /* = 10px on large screens */
  --scale-px: 1px;
}
/* mid-size desktop/laptop range (980–1439px wide, or short screens) */
@media (min-width:980px) and (max-width:1439px), (min-width:980px) and (max-height:499px) /* simplified */ {
  :root {
    --scale-text-rem: clamp(.7rem, calc(.7rem + .41667vw - 3px), 1rem);
    --scale-px: clamp(.5px, .06944vw, 1px);
  }
}
```

Throughout this doc, **R** = `var(--scale-text-rem)` and **P** = `var(--scale-px)`. At 1054px wide, R ≈ **8.39px**.

### 4.2 Breakpoint toggles (space-toggle technique)

All are `min-width` style, and a bigger one implies the smaller ones.

| Toggle | Activates when (simplified) |
|---|---|
| base | phones (portrait <568px) |
| `sm` | ≥568px **or** landscape (aspect ≥13/9) |
| `md` | tablet/desktop: ≥668px (not tall-narrow) or ≥980px |
| `lg` | ≥980px landscape, or ≥1440px |
| `xl` | ≥1200×500 (aspect ≥10/11), or ≥1440×700 |
| `xxl` | ≥1440×700 |
| `xxxl` | ≥1920×700 |
| `xxxxl` | ≥2400×700 |

How it works:
```css
:root { --md: ; --n-md: initial; }                 /* md inactive */
@media (/* md query */) { :root { --md: initial; --n-md: ; } }
.x { font-size: var(--md, 2.6rem) var(--n-md, 2.1rem); } /* desktop | mobile */
```
If you rebuild this, plain `@media` blocks give the same result.

### 4.3 Spacing and grid

- Page side padding: `--spacing` ≈ **14.6px** at 1054px (`.px-1`). It scales with P.
- 12-column grid (`.row`, `.col-12`, with `--grid-gx` / `--grid-gy` gutters).
- **Hairline vertical divider at exactly 50% width.** It runs down most sections in `--t-line` (white 30%). Left-half copy and right-half copy sit on either side.
- Hairline horizontal rules (`--t-line`) separate the headline zone from the copy zone.
- Header height: **44px** at this viewport (`--promo-header-height` = 80P at xxxxl, 60P at md, 40P on mobile). Sections use `.pt-promo-header` to clear it.
- No border radius anywhere (`--btn-border-radius: 0`).

---

## 5. Typography (measured)

### 5.1 Font families

| Role | Family | Weight | Files | Notes |
|---|---|---|---|---|
| Display | **Hardbop** Bold | 700 | `Hardbop-Bold.woff2/.woff` | Ultra-condensed, tall, all-caps grotesque with slightly softened, ink-trap-ish corners. Always `text-transform: uppercase`, `letter-spacing: 0` |
| Text / UI | **HeadingNow 73 Book** | 400 | `HeadingNow-73Book.woff2/.woff` | Light-weight, slightly extended neo-grotesk. Always tracked tight (`-0.03em`) |
| Fallback | `Helvetica, Arial, sans-serif` | | | |

Loaded with `font-display: swap`.

Free substitutes (closest feel):
- Hardbop → **"Anton"** (closest weight), **"Six Caps"** (tall extreme), or "Bebas Neue". Use `transform: scaleY(1.1)` if it looks too squat.
- HeadingNow 73 Book → **"Archivo"** at 300–400 with `font-stretch: 112%`, or "Familjen Grotesk" / "Host Grotesk" Light.

### 5.2 Type scale

R = `--scale-text-rem`, so 1R = 10px on large screens and ≈8.39px at 1054px wide.
`--lh` is the line height; every class sets `line-height: var(--lh)`.

| Class | Family | Base (mobile) | md | xxxl | xxxxl | Tracking | Case |
|---|---|---|---|---|---|---|---|
| `.text-h1` | Hardbop 700 | 14.3R / 11R | 25.7R / 20R | 30.1R / 23R | 38.5R / 30R | 0 | UPPER |
| `.text-h2` | Hardbop 700 | 14.3R / 11R | 22.8R / 18R | — | 38.5R / 30R | 0 | UPPER |
| `.text-h2-sm` | Hardbop 700 | 11.4R / 9R | 22.8R / 18R | — | 38.5R / 30R | 0 | UPPER |
| `.text-h5` | Hardbop 700 | 8.5R / 9R | | | | 0 | UPPER |
| `.text-lead` | HeadingNow 400 | 3.2R / 3.5R | 5.1R / 5.5R | — | 7.6R / 8R | -0.03em (md+: -0.06em) | none |
| `.text-base` | HeadingNow 400 | 2.1R / 2.5R | 2.6R / 3R | — | 3.8R / 4.5R | -0.03em | none |
| `.text-subtitle` | HeadingNow 400 | 1.6R / 2R | 2.6R / 3R | — | 3.8R / 4.5R | -0.03em | none |
| `.text-h4` / `.text-small` | HeadingNow 400 | 1.6R / 2R | 2R / 2.5R | — | 2.6R / 3R | -0.03em | none |
| `.text-bit-small` | HeadingNow 400 | 1.6R / 2R | — | — | 2R / 2.5R | -0.03em | none |
| `.text-bit-smaller` | HeadingNow 400 | 1.2R / 1.6R | 1.6R / 2R | | | -0.03em | none |
| `.text-smaller` | HeadingNow 400 | 1.2R / 1.6R | 1.3R | — | 1.6R / 2R | -0.03em | none |
| `.text-card-h1` | HeadingNow 400 | 3.2R / 3.5R | 4R / 4R | | | -0.04em | none |
| `.text-card-h2` | HeadingNow 400 | 1.6R / 2R | 2R / 2.5R | | | -0.03em | none |
| Nav / header / footer | HeadingNow 400 | 1.2R / 1.6R | | | | -0.03em | none |

**Reference renders at 1054×748 (computed):**
- Section headlines ("HEY CREATIVES", "CENTRALIZE"): Hardbop **164.6px**, black, uppercase. Cap height fills about 120px.
- Body copy (`.text-base`): HeadingNow **21.8px / 25.2px**, letter-spacing -0.65px, white.
- Small copy: **16.8px / 21px**.
- Header nav and footer links: **10.9px / 13.4px**.

**Text-box trim.** Headlines use `.text-box-trim` so the cap height sits flush with the container and has no extra leading:
```css
.text-box-trim { text-box: cap alphabetic; }
.text-box-trim::before { content:""; display:block; height:0; margin-bottom: calc((var(--lh,1em) - 1em)/-2 + var(--fos,0em)); }
.text-box-trim::after  { content:""; display:block; height:0; margin-top:    calc((var(--lh,1em) - 1em)/-2 + var(--foe,0em)); }
/* --fos:-.169em; --foe:-.088em */
```

**Full-bleed wordmark titles.** "FOLLOW.ART", "THE CARD", "TESTIMONIALS", "CONNECTORY" and "JOIN" are rendered as **inline SVG** (`.title > svg`). They are stretched edge to edge, wider than any font size could make them. The letters are black, except the hero, which is white.

---

## 6. Motion system

### 6.1 Easing and duration tokens (measured)

| Token | Value | Uses |
|---|---|---|
| `--ease-heavy` (EASE_A) | `cubic-bezier(0.55, 0, 0.1, 1)` | Big transforms: intro reveal, header morph, card flips, clip reveals. Used 24× in the CSS |
| `--ease-snappy` (EASE_B) | `cubic-bezier(0.25, 0.74, 0.22, 0.99)` | Hover colour and opacity, button accents. Used 14× |
| linear | — | Infinite loops: carousel, spinner, loader |

| Duration | Where |
|---|---|
| 0.3s | Hovers (buttons, carousel cards) |
| 0.4s | Page fade, header background swap, underline clip reveal, image-trail photo |
| 0.8s | Card flip, fade-absolute, testimonial card |
| 1.5s | Intro reveal, header expand/collapse, Join button repositioning |
| 1s delay | Intro decorations and hero canvas wait 1s after the title starts |

### 6.2 Signature: tilted "paper sheet" section stacking (scroll-linked)

Each section after the hero is built like this:
```html
<section class="ui-pink">
  <div class="section section--under-next" style="position:relative; height:~2–2.5×100vh">
    <div class="section__layer section__layer--sticky section__layer--full-height ui-background"
         style="position:sticky; top:0; transform-origin:0 0;"> …content… </div>
  </div>
</section>
```
- Sections are **taller than the viewport**: 1496px (2×vh), 1888px or 1927px at a 748px viewport. The inner layer is `position: sticky` and stays pinned while the next section scrolls up over it.
- The incoming layer is **rotated clockwise around its top-left corner** and **straightens as it rises**. These values were measured from inline styles:

| Layer top (px from viewport top) | progress `p = top / vh` | rotate | translateX |
|---|---|---|---|
| 736 | 0.984 | 14.51° | 8.33% |
| 536 | 0.717 | 7.69° | 4.42% |
| 336 | 0.449 | 3.02° | 1.73% |
| 136 | 0.182 | 0.49° | 0.28% |
| 0 | 0 | 0° | 0% |

**Formula (fits all samples):**
```js
const p = clamp(layerTop / viewportHeight, 0, 1);
const deg = 15 * p * p;            // quadratic ease-out as it lands
const tx  = deg * 0.5741;          // % of width; pushes the sheet right to hide the gap the rotation opens
layer.style.transform = `translateX(${tx}%) rotate(${deg}deg)`;
layer.style.transformOrigin = '0% 0%';
```
The sheet's top edge enters lower on the right, like a page slid onto a desk. The previous section stays visible underneath until it is covered. Lenis smoothing makes the whole motion feel buttery.

### 6.3 Page load

1. **Loading screen** (`.loading-screen`, fixed, `inset:0`, `z-index:9999`, theme bg). Ten hand-drawn doodle glyphs sit stacked at the centre (`left/top:50%; transform:translate(-50%,-50%)`). They flash one after another:
   ```css
   @keyframes changingElements { 0%{opacity:0} 10%{opacity:1} 20%{opacity:0} 100%{opacity:0} }
   .loading-screen__decoration { animation: changingElements 1.5s linear infinite; opacity:0; }
   .loading-screen__decoration-1 { animation-delay: 0s }
   .loading-screen__decoration-2 { animation-delay: .3s }
   .loading-screen__decoration-3 { animation-delay: .6s }
   .loading-screen__decoration-4 { animation-delay: .9s }
   .loading-screen__decoration-5 { animation-delay: 1.2s }
   ```
   Result: a stop-motion "flipbook" of scribbles, each visible for about 0.15s.
2. **Header** enters with `.promo--has-loading-state` (`opacity:0; translateY(-200%)`). On `.promo--loaded` it moves to `opacity:1; translateY(0)` with opacity 1.5s EASE_A.
3. **Intro reveal** (adding `.intro--show`). All parts use `transition: transform 1.5s cubic-bezier(.55,0,.1,1)`:
   | Element | From | To |
   |---|---|---|
   | `.intro__title` (FOLLOW.ART SVG) | `translateY(-80%) scaleY(0)` | `translateY(0) scaleY(1)`: drops down and unfolds vertically |
   | `.intro__footer` (tagline row) | pushed off-screen below | `translateY(0)` |
   | `.intro__title-decoration` (doodle image) | desktop `translateY(300%) rotate(35deg)`; mobile `translate(-100%,150%) rotate(35deg)` | `translate(0)`, delay **1s** |
   | Hero WebGL canvas | desktop `translateY(100%) rotate(35deg)`; mobile `translate(-100%,50%) rotate(35deg)` | `none`, delay **1s**: the card ring swings up from bottom-right |
4. Route changes: `.page-enter-active, .page-leave-active { transition: opacity .4s }`.

### 6.4 Section-by-section motion

**§0 Hero, orange.** Full-width white "FOLLOW.ART" SVG wordmark across the top ~45% of the screen. Below it, a WebGL **ring of black profile cards** sits on a tilted cylinder, about 7 cards visible. Each card has a name in HeadingNow, a role, an orange "Support me" chip and a photo. The ring **auto-rotates continuously** around its vertical axis, and the cards curve with the cylinder. It is tilted roughly -10° in Z and seen slightly from above. A black **hand-painted brush ellipse** circles the ring and passes behind the cards at the back and in front at the front. Bottom-left: the two-line lead "One Card. / Share it. Get connected. Be supported." in white `.text-lead`. On scroll the hero stays pinned and section 1 slides over it (§6.2).

**§1 Get Seen, green.** Left half: a WebGL **video poster card**. It shows a photo of hands holding the printed "How FOLLOW.ART works?" booklet, slightly rotated, on top of a thick **orange brush circle**. A small white play button sits in the centre. Hovering the media wrapper reveals an orange brush accent behind the play button:
```css
.btn--accent .btn__hover-accent { opacity:0; transform: scaleX(.5) translateY(-50%);
  transition: opacity .3s var(--ease-snappy), transform .3s var(--ease-snappy); }
.section-2__media-wrapper:hover .btn__hover-accent { opacity:1; transform: scaleX(1) translateY(-50%); }
```
Right half: "HEY CREATIVES" in Hardbop black, with a white hand-drawn **sparkle** doodle overlapping the final "S". A horizontal hairline sits below it, then the white copy block ("Being seen is the start…", with a hyphen-led list).

**§2 The Card, pink.** A full-bleed black "THE CARD" SVG wordmark. Two WebGL cards rise **through** the letters: an orange Card front with a QR code, and a black profile Card with a photo. Both are tilted about ±20° in different directions and float up with scroll parallax. Then a hairline rule and two columns of copy: "The essential tool for your creative practice" on the left, the description on the right.

**§3 Centralize, green.** "CENTRA/LIZE" in Hardbop, with a white **star** doodle. On the right sits a 2×2 grid of square black **flip cards** numbered 1–4 ("Financial support", "Professional presentation", "Instant sharing", "Better connection") on top of an orange brush "X" stroke. Hovering a card flips it in 3D to its description:
```css
.section-4__card-inner { transition: transform .8s var(--ease-heavy); will-change: transform; transform-style: preserve-3d; }
.section-4__card:hover .section-4__card-inner { transform: rotateY(180deg); }
.section-4__card-front, .section-4__card-back { backface-visibility: hidden; display:flex; flex-direction:column; justify-content:space-between; }
.section-4__card-back { transform: rotateY(180deg); }
```
Card layout: a small number top-left, the label bottom-left in white `.text-card-h2`. Measured size is 159×187 at 1054px. The left column holds white copy ("Stop sending people to five different links…"). **Animated underline**: the key phrase gets a hand-drawn orange underline that wipes in left→right:
```css
.underline-text-piece__decoration { clip-path: inset(0 100% 0 0); transition: clip-path .4s var(--ease-heavy); }
.underline-text-piece--expanded .underline-text-piece__decoration { clip-path: inset(0 0 0 0); }
```

**§4 Audience Support, pink.** "AUDIENCE / SUPPORT" stacked top-left with a white **$ doodle** overlapping. Small right-aligned caption top-right ("Hundreds of people have already supported creators through The Card."). Lower right: copy "Support Me button in your Card lets people back your work financially." Along the bottom runs a **horizontal infinite marquee** of square supporter portraits (117×117, about 9px gap):
```css
@keyframes loop-carousel-animation { from { transform: translate(-100%); } to { transform: translate(0); } }
.section-3__loop-group { animation: loop-carousel-animation 50s linear infinite; will-change: transform; }
/* two identical groups side by side → seamless; moves left→right */
.section-3__loop-carousel:has(.section-3__card:hover) .section-3__loop-group { animation-play-state: paused; }
.section-3__card { transition: opacity .3s var(--ease-snappy); }
.section-3__loop-carousel:has(.section-3__card:hover) .section-3__card:not(:hover) { opacity: .1; }
.section-3__card-content { opacity: 0; transition: opacity .3s var(--ease-snappy); }
.section-3__card:hover .section-3__card-content { opacity: 1; }   /* name overlay */
```

**§5 Testimonials, blue.** A full-bleed "TESTIMONIALS" wordmark with a white **oval scribble** around the "O". A WebGL **testimonial carousel** sits on top. The active card is a flat white rectangle with quote text, an avatar, the member's name, role and country, and a flag on the right. Neighbouring cards curl and bend like paper and fan out in an arc to the right (page-curl deformation in the shader). "‹ Prev" and "Next ›" text buttons sit under the active card. On change, cards slide along the arc and flatten as they reach the centre (~0.8s, `--ease-heavy`). An icon nudge animation plays on the arrow buttons on hover:
```css
@keyframes icon-next-animation { 33.33% { transform: rotate(-5deg); } 66.66% { transform: rotate(-10deg); } }
.icon-next, .icon-shake { animation: icon-next-animation .45s step-end infinite; }
.icon-next-reverse, .icon-shake-reverse { animation: icon-next-animation .45s step-end infinite reverse; }
```
`step-end` makes the arrow *tick* between 0°, -5° and -10° like a hand-drawn jitter. It is not a smooth wobble.

**§6 The Connectory, green.** A small kicker line "Search for people to work with" above a full-bleed "CONNECTORY" wordmark. The white script word "the" overlaps the left edge. A WebGL **screenshot of the Connectory web app** (a white UI with black artwork cards) rises from behind the letters. It is in perspective, rotated in 3D (≈ rotateX 10°, rotateY -15°) with a slight bend, and straightens as you scroll. Then a hairline rule and two columns: "A searchable global directory of creative professionals" on the left, and "Join 4K+ members… No algorithms, no race for attention, no echo chambers." on the right.

**§7 Join Us + footer, orange.** A giant vertical "JOIN" in black Hardbop on the left, with a white script "Us". **Image trail**: as the cursor moves over the area (505×543), photos pop out along the path:
```css
.image-trail__photo { position:absolute; left:0; top:0; translate:-50% -50%;
  width: 10.96vw;  /* mobile 28.2vw */
  transition: scale .4s, opacity .4s; }
.image-trail--active .image-trail__photo { opacity:0; scale:.4545; }   /* idle/fading photos shrink out */
/* resting composition when idle: --1 (31.1%,36.9%, scale .5625), --2 (47.4%,50.3%, scale .625), --3 … */
```
JS sets the newest photo's `left/top` to the cursor position and the class `--active-n`. Older photos shrink to 0.45 and fade. When the pointer leaves, the photos settle into a fixed collage (`.image-trail__photo--1..n`). Right column: "Create Your Card and turn everyday encounters into supporters". A hand-drawn black **arrow** points at the fixed Join button. Footer row: © year and email on the left with black square social icons; legal links in the middle; "Digital product development by Vola Infra" on the right. Footer text is 10.9px.

### 6.5 Persistent UI motion

**Header** (`.promo-header`, fixed, 44px):
- Left: "FOLLOW. ART" with the tagline "Your creative practice, centralized" below it in white 60%.
- Centre: nav (About · Our Product · Community Board · Pricing · FAQ).
- Right: Login · Join. All in white HeadingNow at 10.9px.
- A hairline bottom border (`::after`) draws in with `transform: scaleX(0→1)` over 1.5s `--ease-heavy` when the header is `--expanded`.
- In the expanded state on desktop, the row shifts up 9P and the logo text fades in. All of these transitions run 1.5s `--ease-heavy`.
- The `.promo-header__animated-button` font size animates over 1.5s. The header "Join" grows and shrinks as it hands off to the floating button.
- The background colour swaps to the current section's theme (0.4s).

**Floating Join button** (`.fixed-sign-up-button`):
- Fixed bottom-right at `var(--spacing)`. Width **15.07vw** on desktop, 159×59 at 1054px.
- Solid black. "Join" in white HeadingNow bottom-left; a small circled arrow icon top-right.
- Moves with `transform 1.5s --ease-heavy` when docking to or from the header (`--transition-header`), and `0.8s` when flipping like a card (`--transition-card-flipping`).
- Hidden state: `opacity:0`.
- Sits above the cookie banner (`bottom: calc(var(--spacing) + var(--cookie-message-mobile-height))`).

**Buttons (`.btn`)** are text-first and minimal.
- `.btn__text-text`: colour transitions over 0.3s `--ease-snappy`.
- `::before` / `::after` layers animate `transform` and background over 0.3s.
- `--accent` buttons scale in an orange brush shape behind the label on hover (scaleX .5→1, opacity 0→1).
- `--btn-border-size: 1px`, `--hover-accent-height: 22px`.

**Custom scrollbar.** A 1px black thumb (`.scrollbar__thumb`, ~81px tall) sits on the right edge and fades via opacity over 0.4s.

**Cookie banner.** A small white box, bottom centre, with grey text ("This website uses **cookies**") and two outlined black buttons (Deny / Accept), 1px black border, square corners.

**Spinner.** `@keyframes spinner { to { transform: translate(-50%,-50%) rotate(1turn) } }`, 1s linear infinite.

**Fade helper.** `.fade-absolute-enter-active { transition: opacity .8s var(--ease-heavy) }`.

---

## 7. Illustration and asset language

- **Doodles.** White (on colour) or black hand-drawn marker strokes, exported as SVG or PNG. Set: 4-point sparkle, scribbled star, dollar sign, oval loop, script words "the" and "Us", arrow, and the ten loader glyphs. Each overlaps a headline at about 0.6–1× cap height and is slightly rotated.
- **Brush strokes.** Orange (`#F4793A`) dry-brush paint marks behind media: a circle (§1), an "X" (§3), plus a black ellipse (hero) and the button hover accent. They have rough edges and visible bristle texture.
- **Cards.** Pure black rectangles with square corners. White HeadingNow text, an orange pill chip ("Support me"), a portrait photo and a small QR code. They are the product hero object, repeated everywhere.
- **Photography.** Real people (artists and curators), natural light, mixed colour and black-and-white, cropped square.

---

## 8. Layout map (desktop, 1054×748)

```
┌──────────────────────────── fixed header 44px (bg = current section) ───────────────────────────┐
│ FOLLOW. ART / tagline        About  Our Product  Community Board  Pricing  FAQ        Login Join │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
§0 ORANGE  [ F O L L O W . A R T  — white SVG, full width ]
           [   WebGL rotating ring of black cards + black brush ellipse   ]
           One Card. / Share it. Get connected. Be supported.                    [■ Join ↗] fixed
§1 GREEN   ┌ media card on orange brush circle ┐│ HEY CREATIVES ✧
           │ (play btn)                        ││───────────────────────────────
           └───────────────────────────────────┘│        Being seen is the start…
§2 PINK    [ T H E   C A R D  — black SVG; WebGL cards rising through ]
           ────────────────────────────────────┬──────────────────────────────
           The essential tool…                 │ A digital Card with your work…
§3 GREEN   CENTRALIZE ★                         │   ┌1┐┌2┐   (orange brush X behind)
           Stop sending people…                │   └─┘└─┘  flip on hover
                                               │   ┌3┐┌4┐
§4 PINK    AUDIENCE $                          │                      caption (right)
           SUPPORT                             │ Support Me button…
           [■][■][■][■][■][■][■][■][■]  ← infinite marquee, 50s →
§5 BLUE    [ T E S T I M ◯ N I A L S ]  + WebGL curled paper cards, Prev / Next
§6 GREEN   Search for people to work with / "the" C O N N E C T O R Y + WebGL app screenshot
           A searchable global directory…      │ Join 4K+ members…
§7 ORANGE  J  "Us"  (image trail)              │ Create Your Card and turn…
           O                                   │                 ──→ [■ Join]
           I N                                 │
           ─────────────────────────────────────────────────────────────────────
           © 2026 FOLLOW.ART  ■■■■■   Brand Kit / Buy Gift Card / Terms…   Digital product development by …
```

---

## 9. Rebuild starter (CSS tokens)

```css
@font-face { font-family: Hardbop; font-weight: 700; font-display: swap;
  src: url(/fonts/Hardbop-Bold.woff2) format("woff2"); }
@font-face { font-family: HeadingNow; font-weight: 400; font-display: swap;
  src: url(/fonts/HeadingNow-73Book.woff2) format("woff2"); }

:root {
  /* palette */
  --c-orange:#F4793A; --c-green:#8E9487; --c-pink:#C5939D; --c-blue:#8498AC;
  --c-black:#000; --c-white:#fff; --c-grey:#9C9C9C; --c-error:#EA1B4F;
  /* motion */
  --ease-heavy:  cubic-bezier(0.55, 0, 0.1, 1);
  --ease-snappy: cubic-bezier(0.25, 0.74, 0.22, 0.99);
  --dur-hover:.3s; --dur-ui:.4s; --dur-flip:.8s; --dur-hero:1.5s;
  /* scale */
  --R: 1rem;                       /* html font-size:10px */
  --spacing: clamp(10px, 1.39vw, 20px);
  --header-h: clamp(40px, 4.17vw, 80px);
}
@media (min-width:980px) and (max-width:1439px) {
  :root { --R: clamp(.7rem, calc(.7rem + .41667vw - 3px), 1rem); }
}
html { font-size:10px; }
body { margin:0; font-family: HeadingNow, Helvetica, Arial, sans-serif; letter-spacing:-.03em;
       color: var(--t-text); -webkit-font-smoothing: antialiased; }

.ui-orange{--t-background:var(--c-orange)} .ui-green{--t-background:var(--c-green)}
.ui-pink{--t-background:var(--c-pink)}     .ui-blue{--t-background:var(--c-blue)}
[class*="ui-"]{ --t-text:#fff; --t-heading:#000; --t-line:hsla(0,0%,100%,.3); --t-small:hsla(0,0%,100%,.6);
  background: var(--t-background); color: var(--t-text); }

.display { font-family: Hardbop, Helvetica, Arial, sans-serif; font-weight:700; text-transform:uppercase;
  letter-spacing:0; color: var(--t-heading);
  font-size: calc(var(--R)*14.3); line-height: calc(var(--R)*11); }
@media (min-width:668px){ .display{ font-size:calc(var(--R)*22.8); line-height:calc(var(--R)*18);} }
@media (min-width:2400px) and (min-height:700px){ .display{ font-size:calc(var(--R)*38.5); line-height:calc(var(--R)*30);} }

.text-lead { font-size:calc(var(--R)*3.2); line-height:calc(var(--R)*3.5); }
.text-base { font-size:calc(var(--R)*2.1); line-height:calc(var(--R)*2.5); }
.text-small{ font-size:calc(var(--R)*1.6); line-height:calc(var(--R)*2); }
@media (min-width:668px){
  .text-lead{ font-size:calc(var(--R)*5.1); line-height:calc(var(--R)*5.5); letter-spacing:-.06em; }
  .text-base{ font-size:calc(var(--R)*2.6); line-height:calc(var(--R)*3); }
  .text-small{ font-size:calc(var(--R)*2); line-height:calc(var(--R)*2.5); }
}
```

### Scroll-sheet JS (Lenis)
```js
import Lenis from 'lenis';
const wrapper = document.querySelector('.scrollable__area');
const lenis = new Lenis({ wrapper, content: wrapper.firstElementChild, lerp: 0.1 }); // lerp assumed
function raf(t){ lenis.raf(t); updateSheets(); requestAnimationFrame(raf); }
requestAnimationFrame(raf);

function updateSheets(){
  const vh = wrapper.clientHeight;
  document.querySelectorAll('.section__layer--sticky').forEach(layer => {
    const top = layer.parentElement.getBoundingClientRect().top;  // section's top edge
    const p = Math.min(Math.max(top / vh, 0), 1);
    const deg = 15 * p * p;
    layer.style.transformOrigin = '0 0';
    layer.style.transform = `translateX(${deg * 0.5741}%) rotate(${deg}deg)`;
  });
}
```

---

## 10. Quality checklist for a faithful rebuild

- [ ] Only Hardbop (display) and HeadingNow Book (text). No bold body text anywhere.
- [ ] Body text is white, headlines are black, backgrounds are one flat theme colour per section.
- [ ] Hairline 50% vertical divider and horizontal rules in white at 30%.
- [ ] Square corners everywhere. No shadows and no gradients, except the textures inside the WebGL canvases.
- [ ] Each section enters as a sheet tilted 15° clockwise (origin top-left) and flattens quadratically.
- [ ] Intro: title unfolds with `scaleY(0→1)`, the card ring swings in from 35° after a 1s delay, everything over 1.5s `cubic-bezier(.55,0,.1,1)`.
- [ ] Loader: ten doodles flash in stop-motion every 0.3s.
- [ ] Hover vocabulary: Y-axis card flip (0.8s), marquee pause with siblings dimmed to 10%, brush accent scaleX(.5→1), clip-path underline wipe, ticking arrow (`step-end`).
- [ ] The fixed black Join button is always present bottom-right.
- [ ] The header background follows the section underneath.

---

### Unverified items
- Exact WebGL shader behaviour (ring rotation speed, paper-curl amount, Connectory tilt angles) is **observed** from screenshots, not read from source. The bundles are minified and the canvases render only pixels.
- The Lenis `lerp` value and the exact media-query ranges for the clamp scale are inferred.
- Font foundries are not confirmed. HeadingNow and Hardbop are commercial faces. License them, or use the substitutes listed in §5.1.
