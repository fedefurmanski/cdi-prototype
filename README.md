# CDI — Website redesign prototype

Static prototype of the new **cdi.lu** (Centre pour le développement
intellectuel): the home page and the whole **À propos** section — 16 pages in
all — built from the Figma file
[CDI Refonte HP](https://www.figma.com/design/AmROMNmh0wuaWCuWTJqiNy/CDI-Refonte-HP?node-id=549-145)
and from the client's review rounds in MarkUp.

It is a **reference for the real implementation**, not production code: there
is no CMS, some content is placeholder (flagged below), and a few features only
exist to present the design (version switch, hard-coded search index). Layout,
behaviour, breakpoints and animations are meant to be reproduced as they are.

No build step and no dependencies. Code comments are in Spanish; this file is
the English overview.

```bash
python3 .claude/serve.py
```

Then open http://127.0.0.1:4173. Any static server on the project root works
too. `serve.py` only adds `Cache-Control: no-store` (so CSS/JS edits show up on
reload) and serves each request in its own thread.

> macOS blocks unauthorised processes from reading `~/Downloads`. If the
> server fails with *Operation not permitted*, move the project elsewhere or
> grant the terminal access in System Settings → Privacy & Security → Files and
> Folders.

External resources loaded at runtime: Open Sans from Google Fonts, Leaflet from
a CDN and OpenStreetMap tiles (annexe pages only).

---

## Contents

1. [Files](#files)
2. [Pages](#pages)
3. [Query parameters and flags](#query-parameters-and-flags)
4. [Foundations](#foundations)
5. [Decorative shapes](#decorative-shapes)
6. [Home page](#home-page)
7. [À propos pages](#à-propos-pages)
8. [Responsive behaviour](#responsive-behaviour)
9. [Animation system](#animation-system)
10. [Accessibility](#accessibility)
11. [Pending content and open points](#pending-content-and-open-points)
12. [Gotchas worth knowing](#gotchas-worth-knowing)

---

## Files

```
index.html                     Home
a-propos-*.html                À propos section: 8 pages + 7 annexe pages
css/
  tokens.css                   Custom properties: colour, type scale, layout,
                               motion, section colours, high-contrast overrides
  base.css                     Reset, container, decorative layer, reveal states,
                               mobile shape composition (.deco-foot)
  components.css               Buttons, icons, pills, cards, popup, floating tools
  sections.css                 Header, nav, search, home bands, footer, and all
                               home breakpoints (incl. the mobile menu)
  interior.css                 À propos layout and components, interior
                               breakpoints, team page
js/
  main.js                      Everything interactive, one init function per
                               feature (see the list at the bottom of the file)
assets/
  img/                         Photos resized for the web
    annexes/                   Annexe façades (from cdi.lu)
    equipe/groupe-1.jpg        The only team group photo received so far
    equipe/personas/           Individual portraits (from cdi.lu), 39 files
  svg/                         Decorative shapes of the home, logos
  svg/kit/                     Shapes from the brand design kit (À propos);
                               *-rosa.svg are pink copies (see below)
  icons/                       UI icons, service icons, social networks
  video/hero.mp4               Hero footage (see video/LEEME.txt)
.claude/serve.py               Local server
```

## Pages

| File | Page |
| --- | --- |
| `index.html` | Home |
| `a-propos-qui-sommes-nous.html` | Qui sommes-nous ? (entry point of the section) |
| `a-propos-trouble.html` | Le trouble du développement intellectuel |
| `a-propos-philosophie.html` | Notre philosophie |
| `a-propos-approche.html` | Notre approche |
| `a-propos-publics.html` | Les publics cibles |
| `a-propos-chiffres.html` | Le CDI en chiffres |
| `a-propos-equipe.html` | Notre équipe |
| `a-propos-annexes.html` | Nos annexes (overview) |
| `a-propos-annexe-*.html` | One page per annexe: Clervaux, Echternach, Differdange, Kannercampus Belval, Luxembourg, Kannerinsel Berchem, Warken |

- There is **no "À propos" landing page**: the client dropped it. The nav item
  links straight to *Qui sommes-nous ?*.
- File names are **flat** (no `a-propos/` folder) so that every page uses the
  same relative paths to `css/`, `js/` and `assets/`.
- Header and footer are copied verbatim into every page. Other nav items
  (parents, professionals, news, contact, services) are `#` links for now.

## Query parameters and flags

**URL parameters** (for QA, screenshots and showing variants):

| Parameter | Effect |
| --- | --- |
| `?popup=off` / `?popup=on` | Skip / force the event popup on the home |
| `?contrast=on` | Force high-contrast mode |
| `?fs=0\|1\|2` | Force a text-size step (A−/A+) |
| `?switch=on` | Show the hidden version switch (bottom left) |
| `?intranet=blue\|pink` | Intranet button colour (default `blue`) |
| `?profiles=gradient\|cards\|banners` | Home "profils" band variant (default `gradient`) |
| `?export=1` | Capture mode: no decorative shapes, no animation, hero at artboard height |
| `?export=2` | Same, but keeps the shapes (to compare against Figma) |

**Constants in `js/main.js`** that matter for production:

| Constant | Value | Note |
| --- | --- | --- |
| `POPUP_ENABLED` | `true` | Event popup on the home |
| `REMEMBER_DISMISSAL` | `false` | Shows the popup on every load, handy for review. **Set to `true` in production**: it is then shown once per event (stored in `localStorage`) |
| `POPUP_DELAY` | 600 ms | Delay before the popup opens |
| `MIN_AUTOPLAY_WIDTH` | 900 px | The hero video only autoplays above this width |
| `PAGINAS`, `FRECUENTES` | — | The search index and the "frequent searches" chips. Prototype only: in production this is the CMS search |

Other tuning numbers (`HERO_ZOOM`, `HERO_DRIFT`, `STAGGER_MS`, `DECO_IN_STEP`,
`LINE_STEP`, `DECO_SHIFT`, `FONT_STEPS`) are commented where they are declared.

## Foundations

**Scale.** The design is a 1512px artboard with 120px side margins.
`.container` reproduces that 1272px box, centred, and shrinks below 1352px with
a 40px minimum gutter. At 1512px the home matches the Figma pixel for pixel.

**Tokens** (`css/tokens.css`) are the single source of truth for colour, type,
spacing and motion. A few that are not obvious:

- **Section colours.** Each nav item and each page `<body>` carries
  `data-section`, which sets `--section` and `--section-ink`: À propos pink,
  Parents orange, Professionnels teal, Actualités coral, Contact green. In the
  nav the colour is only a thin underline (text stays black — the client
  rejected coloured nav text). On À propos pages it drives the sidebar, the
  "next page" card, list bullets and the pink corner shape. Buttons are always
  teal.
- **`--c-on-brand`** is the text/icon colour on brand colours (buttons, badges,
  arrows): night blue, 7.9:1 on the teal. It becomes white in high contrast.
  White text on the brand teal or orange does not pass AA.
- **`--c-teal-ink`** (#008292, 4.56:1) is the teal for text links; the brand
  teal is only used for fills.
- **Type scale** (`--fs-*`) is multiplied by `--fs-scale`, which the A−/A+
  buttons change (1, 1.12, 1.25).
- **Motion**: `--dur-*`, `--ease-out` for entrances, `--dur-hover` +
  `--ease-hover` for everything that reacts to the pointer (see
  [Gotchas](#gotchas-worth-knowing)).

**Icons.** Single-colour icons are CSS masks over `currentColor`
(`.icon.icon--name`), so they inherit colour and animate without touching the
SVG. Multi-colour ones (service icons, social, logos) are `<img>`. Icon URLs
live in `components.css`, not in the markup (see Gotchas).

**Card accent.** Cards set `--accent` inline; border, title and link inherit
it, so recolouring a card is one declaration.

## Decorative shapes

The brand shapes are a big part of the design, and the same system is used on
every page.

- Each band has a `.deco` layer: absolute, behind the content (`z-index: 0`),
  no pointer events. The band clips it with `overflow: hidden`.
- Each shape declares **what it is anchored to** instead of absolute artboard
  coordinates: the left edge of the window (default), `.is-right`,
  `.at-content` (the content box), `.is-center`, `.is-bottom`. Full-bleed
  shapes keep touching the edge on wider screens; the others follow the
  content.
- **Shapes that touch each other in Figma live in one `.deco-cluster`**,
  anchored once, children in local coordinates, so they never drift apart.
  Any new shape that touches another goes into the same cluster.
- **`.deco-rail`** holds a cluster that sticks to the bottom of the window
  while the content scrolls (used for the left column of the À propos pages).
- **`data-deco-pair`**: two halves of a shape that crosses from one band into
  the next (coloured on one side, grey on the other) enter together.
- `.is-cut-left` / `.is-cut-right`: large shapes cut by the window edge. Only
  for shapes that still read when cut (circles, rings, patterns).
- Shapes enter from the edge they are anchored to when their group reaches
  the lower quarter of the screen (`initDecoReveal`), and float with a short
  parallax (`initDecoParallax`) whose travel is **measured per shape** so that
  none gets sliced by its band's edge.

**Brand-kit shapes** (`assets/svg/kit/`) carry their own grey through the SVG
`color` attribute (`#E9EAEC`, painted with `currentColor`). Because they are
used as `<img>`, CSS cannot recolour them; the pink corner shape of the À
propos pages therefore uses pink copies (`kit-XX-Y-rosa.svg`, `#EA5F9E`). In
*Notre philosophie* the large shapes inside the coloured blocks are CSS masks
(`.shape`) and take the block's colour.

On phones (≤760px) the margin shapes are hidden and replaced by **`.deco-foot`**,
a stepped two-row composition at the bottom of the page (3 tiles on top, 4
below, the big one taking 2 × 2), with the "next page" card or the news CTA
sitting on top of it.

## Home page

Bands, top to bottom: hero (video), *Vision* (elevator speech), profiles
(*Pour les parents* / *Pour les professionnels*), services, video block, news,
footer.

- **Hero video** (`initVideo`, `initHeroParallax`): autoplay, muted, loop above
  900px, with a first-frame poster. On scroll it zooms (up to 30%) and drifts
  within the zoom's spare room, so the edge never shows; at rest the framing is
  exactly the approved one.
- **Profiles**: three variants behind the version switch; the client chose
  `gradient`. The `-focus` crops keep faces clear of the text.
- **Services**: nine cards. On phones only 4 show, plus *Afficher les 5
  autres services* (`initServicesMore`).
- **News carousel** (`initNewsCarousel`): reads `--per-view` from CSS (3 / 2
  / 1), moves the track with `translate3d`, arrows outside the content above
  1400px and in the controls row below. On phones: one card with the next one
  peeking, touch swipe (40px threshold), centred position, dots with 24px tap
  targets.
- **Event popup** (`initEventPopup`): native `<dialog>` (focus trap, Escape,
  backdrop for free), see the flags above.
- **Header** (`initHeadroom`): sticky; hides on scroll down and shows on
  scroll up — but only the nav bar comes back, not the government strip and
  toolbar (negative `top` on the sticky header, no JS needed for that part).
- **Toolbar**: contrast, A−/A+, FR/DE/EN (links not wired), *Facile à lire*,
  *Intranet*.
- **Floating tools** (bottom right, every page): *Lire le texte*, accessibility
  and back to top. The first two are **placeholders** with no behaviour yet;
  back to top works (`initBackToTop`).
- **Search** (`initSearch`): the magnifier in the nav opens a panel under the
  bar (full screen on phones) with frequent searches as chips and live
  results — section dot, highlighted match, accent-insensitive. Enter goes to
  the first result; Escape or a click outside closes. The index is static.
- **À propos dropdown** (`initDropdown`): opens on hover with a 120ms grace
  period on close, on click/tap otherwise. It is anchored to `.nav` so it
  aligns with the page grid; closed it uses delayed `visibility` + `inert`
  (not `hidden`, which would kill the transition).

## À propos pages

**Layout** (`css/interior.css`): from the Figma *Diagnostique spécialisé*
page — 292px sidebar, 145px gap, 835px content inside the same 1272px
container. The sidebar card is sticky and marks the current page with
`aria-current="page"`. Above 1000px the section has `min-height: 1080px` so
the left shape column overlaps the sidebar card clearly (a near-touch reads as
a mistake; a generous overlap reads as depth).

**Shapes on desktop.** Each page has its own grey combination in the left
column (a sticky `.deco-rail`) and **one pink shape at the top right**, cut by
the window edge. Every page has a different pink shape (no big single circles,
none repeating its own grey column); the seven annexe pages share the one of
*Nos annexes*. The grey column is at 78% opacity (`--deco-op`), the pink shape
at 100% — the opacity is set on the rail, not on the whole layer.

**Per page:**

- **Le trouble** — *Les causes* is a stepper (`initStepper`, `.steps`): text
  first, then the step index (all four numbers visible, the active one in its
  colour) and arrows. The background takes the step colour at 8%. Incoming
  text is re-revealed line by line. On phones it becomes a carousel header
  (numbers and arrows on one line) and the box animates to the active step's
  height.
- **Notre philosophie** — coloured blocks with a large kit shape cut by the
  right edge.
- **Notre approche** — `.approach`: a real `tablist` (arrows, Home/End, no
  autoplay) with three photos cross-fading in place and the texts stacked in
  one grid cell (`inert` on hidden panels, not `hidden`). On phones the step
  labels spread across the photo, the arrows sit on both sides at mid-height,
  and the photo can be swiped.
- **Les publics cibles** — three full-width rows with the photo on the side;
  photo on top on narrow screens.
- **Le CDI en chiffres** — only the three big figures count up
  (`initCounters`); the breakdowns below are static **on purpose** (agreed in
  the 08/10 meeting). The count waits until the figure has faded in, so it is
  actually visible. The final number is in the markup, so it reads without JS.
- **Notre équipe** — see below.
- **Nos annexes** — a grid of whole-clickable cards (phone and mail stay
  separate links on top). Each annexe page: façade photo (until the drone
  video arrives), the *chargé(e) de direction*, contact, sites and an access
  map.
- **Annexe map** (`initAnnexeMap`): Leaflet with OpenStreetMap tiles greyed
  out in CSS and a brand marker. **OSM's tile policy does not allow site
  traffic: production needs a keyed provider** (CARTO, MapTiler, Stadia…). No
  cookie banner is needed for it as it stands.

**Notre équipe.** Seven teams with the official names from cdi.lu.

- **Desktop** (`initTeam`): a group photo per team with one hotspot per
  person. The "+" under each face opens a white card (name, role, mail,
  *Demande-moi à propos de*) right below it, with a small pointer. Hover,
  click or keyboard; Escape closes. Hotspots are positioned by hand per photo
  (`--x`, `--y` in % of the photo; `--bx`, `--by` nudge the "+" in px at the
  835px reference width) and everything scales with the photo through `--u`
  (a container-query unit), so the composition is identical at any width. An
  open card passes over the next team (z-index on `.team`).
- **Narrow** (team container < 720px — phones, tablets, 1024px screens): the
  group photo is replaced by the **team list**, two columns, portrait + name
  + role + mail, without *Demande-moi*. The lists and portraits are taken from
  cdi.lu (41 people; two people sit in two teams).
- Only one group photo exists so far (*Cellule de développement…*); the other
  teams show a "Photo de groupe à venir" box on desktop.

**On phones and tablets (≤1000px)** the sidebar collapses into a bar that says
where you are (*À propos · Qui sommes-nous ?*) and opens the list, and each
page ends with a **next page** card with a counter (*Page suivante · 2/8*; the
last one goes back to the start). Both are built from the sidebar markup by
`initSubnavToggle`, so nothing is repeated per page. Annexe pages have a
static "next annexe" card (*2/7*, cycling).

## Responsive behaviour

The Figma only defines desktop. Everything below 1080px was designed in the
prototype and iterated with the client; it is not in Figma.

| Width | What changes |
| --- | --- |
| < 1352px | Container shrinks (40px minimum gutter) |
| ≤ 1400px | News carousel arrows move into the controls row |
| ≤ 1200px | À propos sidebar and gap narrow (248 / 64px) |
| ≤ 1080px | Burger menu; toolbar moves into the menu panel; profiles in 1 column, services in 2, news 2 per view |
| ≤ 1000px | À propos pages in one column: collapsible sidebar bar, next-page card |
| ≤ 900px | Video block stacked; footer in 2 columns |
| ≤ 760px | Phone layout: section-by-section tuning of the home, margin shapes replaced by `.deco-foot`, news 1 per view with the next card peeking, services show 4, full-screen search |
| ≤ 680px | Services and footer in one column; *Lire le texte* becomes a round button |
| team < 720px | Team pages switch from the group photo to the lists (container query) |

**Mobile menu** (≤1080px): the panel fills the rest of the screen and scrolls
on its own while the page behind stays still. It is a **two-screen
drill-down**: tapping *À propos* slides its sub-menu in from the right with a
*Retour* button and a title; first-level items have a section-colour bar and
enter with a stagger. The toolbar (contrast, sizes, languages, *Facile à lire*,
*Intranet*) moves to the bottom of the panel (`initNav` moves the node), so the
header is only the government strip, logo, search and burger (~134px instead
of ~215px). Toolbar controls and carousel dots have 24 × 24px minimum tap
targets, and the toolbar controls get a 44px hit area on touch screens.

**Vertical rhythm on phones**: 24 / 32 / 48px, and 32px between a section
title and its content.

## Animation system

All of it is switched off with `prefers-reduced-motion`, and nothing is hidden
without JS (initial states only apply under `html.js`).

- **`data-reveal`** + an IntersectionObserver add `is-visible` on entry.
  Variants: `up` (default), `left`, `right`, `scale`, `rise`, `zoom`, and
  `banner` (profile banners: three chained steps — box, photo, text).
  Safety net: if nothing has been revealed after 3s, everything is shown.
- **`data-reveal-group`** staggers its children (90ms, capped at 6). The delay
  is computed when elements enter, from what enters together: what is visible
  on load cascades, what you scroll to appears immediately. A delay written in
  the markup wins.
- **`data-lines`** (`initLineReveal`): text slides up line by line behind a
  mask (120ms apart). Lines are measured after the web font has loaded and
  rebuilt on resize. `data-lines-delay` delays the whole block.
- **Shapes**: see [Decorative shapes](#decorative-shapes).
- **Hover**: lifts, shadows, arrow nudges, icon growth, photo zooms — always
  with `--dur-hover` / `--ease-hover`.

**Verifying animations**: the in-app browser panel of the editor throttles
rendering (transitions and observers may not run until a screenshot forces a
frame), and headless Chrome with `--virtual-time-budget` fires observers
erratically. Check in a real browser; for pixel comparisons use `?export=2`,
where nothing animates.

## Accessibility

- **High contrast** (toolbar button, `html.is-high-contrast`, `?contrast=on`):
  redefines the colour tokens with darker versions that pass 4.5:1 on white,
  raises the hero scrim to 0.72, underlines links and outlines cards. Stored in
  `localStorage` with the text size.
- **Text size**: three steps through `--fs-scale`.
- Buttons and links on brand colours use `--c-on-brand`; text links use
  `--c-teal-ink` (AA).
- Secondary grey text is darker than in Figma, whose #909090 failed AA (3.2:1
  on white, 2.6:1 on the tag pills). `--c-muted` is #707070 (4.7:1 or more on
  white and on the footer grey; inactive languages, copyright, date years,
  sources) and service tags (*Parents*, *Professionnels*) use `--c-grey-500`
  (4.7:1 on their pill).
- Tablists (*Notre approche*, *Les causes*) follow the ARIA pattern; the team
  hotspots are buttons with `aria-expanded` and work with the keyboard.
- The search panel is a dialog: focus goes to the field, Escape returns focus
  to the button.

## Pending content and open points

From the client:

- **Team**: group photos for six teams; names for faces 4, 6 and 8 of the
  existing photo; the *Demande-moi à propos de* topics (all cards show the
  example from Maxime's 07/10 mail). That photo mixes people from the
  development and administrative cells, so its section title is unconfirmed.
- **Annexes**: drone videos (the pages show the façade meanwhile) and photos
  of the *chargé(e)s de direction*.
- **Video block**: the clip (`assets/video/video-block.mp4`) is missing; the
  block shows its poster and the play button is disabled.
- **News**: placeholder content, as in Figma.
- Two e-mail addresses copied from cdi.lu look like typos on the live site:
  `info.annexeechternach@cc-di.lu` and `stéphanie.wagner@cc-cdi.lu`.
- Two toolbar pictograms (contrast, *Facile à lire*) only existed as bitmaps
  in Figma; they are crops in `assets/icons/`. Ask for SVGs.

Design and implementation:

- **Hero contrast**: with the real footage and the 20% scrim from Figma, white
  text drops to 1.41:1 on bright frames. The lever is `--hero-scrim`; at 0.8
  with a left gradient the worst case reaches 5.6:1. Design decision pending.
- **Floating tools**: *Lire le texte* and the accessibility button have no
  behaviour yet.
- **Production switches**: `REMEMBER_DISMISSAL = true`, a keyed map tile
  provider, real search, language links.
- The version switch (`.version-switch` block in `index.html`) and the
  `?profiles` / `?intranet` axes can be removed once the variants are no
  longer needed.

## Gotchas worth knowing

Each of these cost real time; the fixes are in the code with a comment.

- **Never transition a property whose value comes from a custom property that
  changes.** Chrome starts a transition that never advances and the value
  stays at its initial state. Colour states that change at runtime are written
  as literal values (`data-tint`) or classes, not variables.
- **A reveal rule replaces the component's `transition` list.**
  `.js [data-reveal]` (0,2,0) beats a component rule (0,1,0), so the component
  loses its hover transitions. The reveal rule therefore repeats `transform`
  and `box-shadow`. Check `getComputedStyle(el).transitionProperty` on the real
  element.
- **Entrances use `translate` / `scale`, never `transform`.** `transform` is
  reserved for hover states and for the shape parallax; mixing them made the
  reveal's final `transform: none` cancel hover lifts.
- **The `js` and `is-export` classes are set in an inline `<head>` script**, not
  in `main.js`: the module is deferred and runs after first paint, so anything
  hidden for animation flashed into view first.
- **Children of `data-reveal-group` are hidden by a CSS rule on the
  container**, for the same reason: the JS marks them too late.
- **Exclusions in the shape-hiding rule use `:where()`**, not `:not()`:
  `:not()` adds specificity and the rule beat `.is-in`, so standalone shapes
  never appeared.
- **`body { overflow-x: clip }`, not `hidden`**: `hidden` makes the body a
  scroll container and silently disables every `position: sticky`.
- **`min-width: 0` on grid cells that contain a carousel**, or the 300%-wide
  track pushes the column and adds horizontal page scroll.
- **A `url()` inside a custom property resolves against the stylesheet that
  uses it**, not the document; icon paths written in the HTML pointed to
  `/css/assets/…`. They live in `components.css`.
- **Line reveal**: measure after fonts load; words are `white-space: nowrap`
  (the browser split "psycho-pédagogie" at the hyphen); keep track of which
  word had a leading space; the mask needs bottom padding compensated by a
  negative margin or descenders get clipped.
- **Restarting a transition** needs the transition switched off while the
  class is removed (otherwise it animates from 0 to 0), and switched off with
  `transition-property`, not the `transition` shorthand, which also resets the
  stagger delays.
- **Team section stacking**: `.team` is the container for the container query
  and carries the z-index that lets an open card pass over the next team.
- **Nested `<section>`s**: the tab panels are `<section>`s inside
  `<section>`s; a lazy regex that "cuts at `</section>`" takes half a page with
  it.

**If you re-export assets from Figma:**

- Exported SVGs carry an opaque background rect and an artboard-size rect;
  remove them by position (first `<rect>` before the first `<g>`, root size),
  not by colour — the colour is the canvas colour and changes — and never the
  rects inside a `<clipPath>`.
- The export crops to the visible ink (`absoluteRenderBounds`), not the frame:
  recompute `--w`, `--h` and anchors from the render bounds.
- If a shape was edited in Figma (fill, stroke, geometry), re-export it;
  reusing the old local file with the same name silently loses the edit.
- Watch for drop-shadow filters inherited from parent groups, outline rects in
  icon instances, and small glyphs in large viewBoxes (use them at natural
  size).
- `get_metadata` can report coordinates outside the artboard; the export's
  `transform` is the reliable source.
