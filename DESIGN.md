---
name: card-market
description: A quiet catalogue of trading cards — cool slate paper, hairline cards, and one red price tag.
colors:
  cool-paper: "#f8fafc"
  card-stock: "#ffffff"
  recessed-panel: "#f1f5f9"
  ink: "#0f172a"
  body-ink: "#334155"
  secondary-ink: "#475569"
  tertiary-ink: "#64748b"
  weak-text: "#5b6b82"
  empty-slot: "#5b6b82"
  hairline: "#e2e8f0"
  hairline-strong: "#cbd5e1"
  seal: "#0f172a"
  on-seal: "#ffffff"
  price-tag-red: "#dc0a3c"
  price-tag-red-lifted: "#ff637e"
  high-value-amber: "#9a5b00"
  high-value-amber-lifted: "#ffb900"
  prose-link-sky: "#0084d1"
  prose-link-sky-lifted: "#00bcff"
  form-ok-emerald: "#047857"
  form-error-red: "#ec003f"
  night-paper: "#0b1120"
  night-card: "#1e293b"
  night-recessed: "#0f172a"
  night-ink: "#f8fafc"
  night-hairline: "#334155"
  night-hairline-strong: "#475569"
  night-seal: "#e2e8f0"
  night-on-seal: "#0f172a"
  night-price-tag-red: "#ff637e"
  night-high-value-amber: "#ffb900"
  vault-purple: "#7c3aed"
  vault-purple-lifted: "#c4b5fd"
  night-vault-purple: "#c4b5fd"
typography:
  headline:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "32px"
    letterSpacing: "0em"
  title:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "28px"
    letterSpacing: "0em"
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
    letterSpacing: "0em"
  ui:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
    letterSpacing: "0em"
  caption:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
    letterSpacing: "0em"
  numeral-display:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
    fontSize: "60px"
    fontWeight: 900
    lineHeight: "1"
    letterSpacing: "-0.01em"
  micro:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: "15px"
    letterSpacing: "0em"
rounded:
  chip: "4px"
  control: "8px"
  container: "12px"
  banner: "16px"
  pill: "9999px"
spacing:
  hair: "4px"
  tight: "8px"
  control-gap: "6px"
  inline: "12px"
  stack: "16px"
  section: "24px"
  section-lg: "40px"
components:
  button-primary:
    backgroundColor: "{colors.seal}"
    textColor: "{colors.on-seal}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.card-stock}"
    textColor: "{colors.secondary-ink}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  button-icon:
    backgroundColor: "{colors.card-stock}"
    textColor: "{colors.secondary-ink}"
    rounded: "{rounded.control}"
    size: "36px"
  input-field:
    backgroundColor: "{colors.card-stock}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "36px"
  chip-filter:
    backgroundColor: "{colors.card-stock}"
    textColor: "{colors.secondary-ink}"
    rounded: "{rounded.pill}"
    padding: "6px 16px"
  card-product:
    backgroundColor: "{colors.card-stock}"
    textColor: "{colors.ink}"
    rounded: "{rounded.container}"
  badge-pinned:
    backgroundColor: "{colors.price-tag-red}"
    textColor: "{colors.price-tag-red}"
    rounded: "{rounded.chip}"
    padding: "2px 6px"
  badge-high-value:
    backgroundColor: "{colors.high-value-amber}"
    textColor: "{colors.high-value-amber}"
    rounded: "{rounded.chip}"
    padding: "2px 6px"
  pagination-active:
    backgroundColor: "{colors.seal}"
    textColor: "{colors.on-seal}"
    rounded: "{rounded.control}"
    size: "36px"
---

# Design System: card-market

## Overview

**Creative North Star: "The Quiet Catalogue, in a Red Shopfront"**

This interface is a card catalogue you can flip through: entries on cool paper, one hairline per boundary, and a price tag that is the only warm thing on the page. It does not sell with decoration — it sells by being legible. Every screen answers the same three questions in the same order: which card is this, what does it cost, what condition is it in. Ornament that does not serve those three answers is not part of the system.

The palette is deliberately cold: slate paper, white card stock, slate ink, and a single red reserved for money. Because there is no second warm hue anywhere, the price is impossible to miss without being loud — the restraint is what makes it work. The one place the system stops being quiet is the shopfront: the header is a solid **Brand Red** (`#db261d`) bar and the footer is near-black (`#0d0e15`). They are the frame around the catalogue, not part of it — every screen inside that frame still answers the same three questions in the same order. One cool accent exists and is spent entirely on status: a purple strip that marks a card as being in the case rather than in the bulk box. It never touches money. Dark mode is not an inverted theme bolted on; it is the same catalogue read under a lamp, with the same hairline logic and the same single red, lifted one step to stay readable on night paper.

The build is dense but never cramped: 14px UI type carries most of the interface, containers step to 16px only where a card is a real destination, and the whole grid breathes at 16px gutters. Density is honest here — a buyer scanning forty cards does not want whitespace theatre. What keeps that density from feeling cheap is total consistency: one radius for controls, one for containers, one border weight, one shadow that only appears on hover.

**Key Characteristics:**
- **Brand Red (`--color-brand`, `#db261d`)** is the shopfront: header bar, notice section bar, active page cell, active tab, and the high-value section title. It is a *fill* colour, not a text colour, and it never appears inside a card.
- One warm accent family (red) used only for money and "pinned"; one cool accent (purple) used only for "in the case".
- Rarity is ranked by weight, never by hue: the rarity dictionary is client-editable, so a hardcoded colour ramp would break the first time a new tier is added.
- Flat at rest. No shadow, no gradient, no glow as decoration.
- Two radius steps (8px controls, 12px containers) plus pills for chips and full-round for small badges.
- System font stack; hierarchy built from weight and size, never from a second typeface.
- Hairline borders separate everything; color fills are rare and always semantic.
- Light and dark are the same design, one step apart in lightness.

## Colors

A cold slate ledger, interrupted exactly twice: red for price, amber for "high value buyback".

### Brand
- **Brand Red** (`--color-brand`, `#db261d` / dark `#db261d`): measured off the design mockups — the header fill, the "通知公告" section bar, the active IP tab, and the active pagination cell all sample to this one value. It is the site's identity, so primary buttons fill with it too (white on it measures 4.89:1, which clears AA for body-size text). It does **not** replace Price-Tag Red for text: prices keep `#dc0a3c`, whose 5.06:1 / 4.83:1 was tuned for small numerals on card stock and on the page. The two are within a few points of each other and read as one red family on screen.
- **Footer Night** (`--color-footer`, `#0d0e15` / dark `#07080d`): the footer's own ground. The mockups show a faint world-map texture inside it; that is an image asset, not a token, and is not reproduced. **Footer Link Grey** (`#999999`) and **Footer Ink** (`#ffffff`) are the only two colours permitted on it.

### Primary
- **Seal** (`--color-accent`, `#0f172a` / dark `#e2e8f0`): the fill of every primary action. In light mode it is the same near-black as the headline ink, so the primary button reads as "the most solid object on screen" rather than as a branded hue. In dark mode it inverts to near-white. Search submit, "inquire", "contact us", the active page number, and the primary button on error pages all use it.
- **Price-Tag Red** (`#dc0a3c` light / `#ff637e` dark): money, and pinned announcements. Nothing else. It is the only warm color permitted on more than one screen. The light value was darkened from `#ec003f`, which measured 4.53:1 on card stock and 4.33:1 on the page — the latter fails AA for body-size text, and the price now also appears on a sticky bar and on tinted surfaces. The step is nearly invisible by eye but moves the floor from "just clearing" to "clears with margin" (5.06:1 / 4.83:1).

### Secondary
- **High-Value Amber** (`#9a5b00` light / `#ffb900` dark): the "高价买取 / high value buyback" badge and its tinted background at 15% alpha. Signals a card the shop pays premium for; never used for ordinary prices. The light-mode value is darker than the raw amber because the badge text sits on that same amber at 15% — the original `#e17100` measured 2.85:1 there.
- **Vault Purple** (`#7c3aed` light / `#c4b5fd` dark): the "柜藏级" signature — `card_status = packaged`, i.e. graded, sealed, or otherwise in the case rather than in the bulk box. It exists because a buyer's first question at a buyback counter is "is this worth the trip", and the catalogue previously answered it only inside the detail page, in 14px grey text. Dosage is deliberately tiny: a 4px signature strip on the card's image well plus one badge. 5.7:1 on card stock (5.06:1 on its own 8% tint), 7.9:1 on the night card (5.8:1 on its tint). It is the only cool accent in the system, which is exactly why it reads as "status" and not as "money".

### Tertiary
- **Prose-Link Sky** (`#0084d1` light / `#00bcff` dark): links inside admin-authored rich text only. Exists so a link inside an announcement body is distinguishable from body copy without borrowing the price red.
- **Form OK Emerald** (`#047857` light / `#34d399` dark): the success banner after a message is submitted. **Form Error Red** reuses Price-Tag Red at 15% alpha for the failure banner — it is the same red as price, deliberately: something went wrong is as urgent as money.

### Neutral
- **Cool Paper** (`#f8fafc`): page background in light mode. Never pure white — the page must sit behind the cards, not beside them.
- **Card Stock** (`#ffffff`): every container that holds content: header bar, footer, product cards, list rows, input fields.
- **Recessed Panel** (`#f1f5f9`): image wells, the "no image" placeholder, hover fills, and the collapsed-filter body. Anything that should read as "behind" the card stock.
- **Ink** (`#0f172a`): headings, active nav, card names, the numeral on the 404 page.
- **Body Ink** (`#334155`): long-form body copy in announcements and info pages.
- **Secondary Ink** (`#475569`): nav at rest, secondary buttons, card metadata labels.
- **Tertiary Ink** (`#64748b`): footer body copy, section eyebrows.
- **Weak Text** (`#5b6b82` light / `#8494ad` dark): every de-emphasised but readable string — card numbers, dates, counts, placeholder text, "面议". Holds 6.2:1 on white and 4.75:1 on the night card.
- **Empty Slot** (`#5b6b82` light / `#8fa0b8` dark): the "暂无图片" glyph inside empty image wells. Deliberately shares a value with Weak Text: a placeholder is still text a user must read to know why the well is empty, so it may look quiet but must not fail contrast. It previously sat at 1.36:1 — invisible.
- **Hairline** (`#e2e8f0`): the default 1px border on every container, divider, and table rule.
- **Hairline Strong** (`#cbd5e1`): borders that need to read as interactive — inputs, secondary buttons, pagination arrows.

Dark mode re-points the same names: Night Paper `#0b1120`, Night Card `#1e293b`, Night Recessed `#0f172a`, Night Ink `#f8fafc`, Night Hairline `#334155`, Night Hairline Strong `#475569`, Night Seal `#e2e8f0`.

### Named Rules

**The One Warm Colour Rule.** Red appears only for money and for "pinned". If a red element is not a price, a pinned badge, or an error, it is a bug. Amber is its only sanctioned companion, and only on the high-value badge.

**The Third Accent Is Cool Rule.** Vault Purple is the system's only cool accent and carries exactly one meaning: this card is in the case. It never touches a price, a button, a link, or a status message. Any purple that is not on a `packaged` card's signature strip or its badge is a bug in the same way a stray red is.

**The Red-Is-The-Shopfront Rule.** Brand Red fills the header, the footer's complement bars, the active tab and page cell, and primary buttons. Inside a card it never appears: a red that is not the frame, a primary action, or a price is a bug.

**The Two-Theme Rule.** Every color decision is made twice, from the same token names, in `@theme` and in `html.dark`. A raw Tailwind color name (`text-slate-500`, `bg-white`) inside a component is a defect: it will not follow the theme. For the accent family this is now structural — `text-price`, `text-high-value`, `text-pinned`, `text-vault`, `text-link`, `text-success`, `text-danger` — so the component never writes a `dark:` colour variant at all.

## Typography

**Display Font:** none — the system stack, used at headline weight
**Body Font:** `system-ui`, falling back to `-apple-system, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif`

**Character:** Invisible and fast. The stack resolves to SF on Apple hardware, Segoe on Windows, and PingFang / Hiragino / YaHei for Chinese and Japanese — which matters because this product ships three languages and must never depend on a downloaded webfont to look right. Hierarchy is done entirely with size and weight: nothing is ever italic, nothing is ever letter-spaced for effect, and uppercase is never used.

### Hierarchy
- **Numeral Display** (900, 60px/1, tabular): only on the 404 and 500 pages, in Weak Text. A deliberate single moment of scale in an otherwise 14–24px product; it must read as a number, not as a ghost.
- **Headline** (700, 24px/32px): page titles — card name on the detail page, announcement title, info-page title, section title on the shops page.
- **Title** (600, 18px/28px): section headings inside the home page ("通知公告", "高价买取", "最新上架"), the site name in the header.
- **Body** (400, 16px/24px): rich-text announcement and info-page copy at `line-height: 1.75` inside `.prose`, card descriptions, the footer's data notice. The **first paragraph** of an announcement body steps up to the Title size (18px/1.7) and Ink, because it is where the reader actually starts; it does not introduce a new step.
- **UI** (400–600, 14px/20px): the workhorse. Nav links, buttons, inputs, filter labels, table-ish metadata, announcement rows. This is the size most of the interface is set in.
- **Caption** (400, 12px/16px): card numbers, dates, counts, footer legal links, the shop address line.
- **Micro** (400–500, 11px/15px): the three badges only — "置顶", "高价买取", and "有包装". Nothing else may be smaller than 12px.

Rarity names are the one place where **weight ranks, not size and not hue**: SSR and UR render at 600, HR and N at 400, all at Caption size in Weak Text. The rarity set is a client-editable dictionary, so a hardcoded colour ramp would mislabel the first new tier the client adds; weight degrades gracefully (an unknown tier simply gets the regular weight).

### Named Rules

**The No-Display-Type Rule.** There is no display face and no webfont. If a hierarchy problem seems to need a new typeface, it needs a weight or size change instead.

**The Four-Size Rule.** Any given screen uses at most four type sizes: 24, 18, 14, 12 (plus 11 only for badges). A fifth size on one screen means the hierarchy is being solved by accident.

**The Truncate-Once Rule.** Card names truncate with `truncate` in lists and wrap with `break-words` on detail pages. Detail-page headings, `.prose` bodies, and shop names must never overflow their column.

## Layout

A single **1200px** content column (`max-w-[1200px]` plus `px-4`, measured off the mockups: content spans 360→1560 on a 1920 canvas), on every page. The header is sticky and **100px tall** (64px below `md`, where the search field drops to a second row rather than being squeezed).

The home page is a vertical rhythm of `space-y-10` (40px) sections, each led by a Title-weight heading with a "全部 →" link pushed right — **except the banner, which sits flush against the notice bar** (the mockup measures 649 → 650, no gap; the two read as one block). The banner is the only element with a large radius (16px) and the only element that bleeds to a fixed 21:9 aspect. Below the strip, the IP filter is a **40px tab row** (Brand Red fill, white type when active) rather than a select, because the mockup uses tabs for the IP and keeps selects only for series, condition and sort.

List pages use a two-column split at `lg`: a 260px sticky filter rail plus a `minmax(0,1fr)` content column. **Below `lg` the rail is not rendered at all** — the content column opens with a 36px toolbar (filter button carrying the active-filter count, result count, sort select) and the facets appear in a bordered panel only when the button is pressed. The earlier version collapsed the rail behind a button but left the collapsed body in flow, so a phone's first card started ~300px down; it now starts at ~190px. The product grid is 2 columns on phones, 3 at `sm`, 4 at `lg`, with `gap-4` (16px). Cards are `aspect-[3/4]` images over a 12px-padded text block.

Detail pages are a 1:1 split from `md` up, with the image column in a 3:4 well and the text column carrying the breadcrumb, then **`CardInfo`** — the same component the card modal uses: a red rarity pill, the `label：value` rows (name / code / condition), and the price. Below it, the actions and the description. Pressing a card in the home grid no longer navigates: it opens the **card modal**, a white panel at 47% image / 47% info (measured off the mockup) built from that same `CardInfo`, with a link through to the full page. The card in the grid stays a real `<a href>` — modifier and middle clicks still open a new tab, and the modal only intercepts a plain left click.

**The price and its action never scroll away.** From `md` up the price block and its buttons are `sticky top-20` inside the text column. On phones, where there is no second column to stick, the same pair is a `fixed` bottom bar with the card's name and price on the left and "咨询此卡" on the right, inside `env(safe-area-inset-bottom)`. The page reserves matching bottom padding so the bar never covers the last line of the description. This is the product's only conversion path; it should not require scrolling past the description to find.

The shops page is one **store block**: a large photo (960×598, measured) on the left carrying the business hours as white type over a bottom scrim, and a 540-wide right column holding the name, address, phone and the map (540×318), with a measured 61px between the two columns. Below it, the shop switcher rows, and only when there is more than one shop. On phones the whole thing stacks: photo, info, map, rows. Both columns carry `min-w-0` — without it, a long unbroken address pushes the grid wider than the viewport. **When a shop has no photo the left column keeps its aspect and shows the standard "暂无图片" placeholder** — the skeleton (photo left, info + map right) does not change shape with the data, because a page that reflows into a different structure when one image is missing is two layouts to maintain.

Breakpoints in use: `min-[360px]` (pagination step-down), `sm` 640, `md` 768, `lg` 1024, `xl` 1280. The 320px viewport is treated as a real target, not an edge case.

## Elevation & Depth

**Flat at rest.** Nothing in this system floats. Depth is communicated by three flat devices: a 1px hairline border, one step of background tint (Card Stock over Cool Paper, Recessed Panel inside Card Stock), and — on hover only — a small shadow. That is the entire vocabulary.

The header is the one exception that is not depth but translucency: `bg-surface/90` with `backdrop-blur`, so content passing under it stays faintly visible. It is the only backdrop filter in the product.

### Shadow Vocabulary
- **Hover Lift** (`hover:shadow-md`, Tailwind default `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): product cards only, on hover. Confirms "this is a link" without lifting anything at rest.
- **Selected Row** (no shadow): the currently selected shop row is marked by a 2px ink signature bar on its left edge plus one step of background tint. The bar is a border, not elevation — an earlier `shadow-sm` here contradicted Flat-At-Rest and was the only shadow in the product not attached to a link.

### Named Rules

**The Flat-At-Rest Rule.** No shadow, glow, or gradient at rest. If a surface needs to be distinguished, change its border or its tint, not its elevation.

**The Border-Or-Tint Rule.** Every "these are separate things" moment resolves to either a 1px hairline or one step of background tint. Never both, never a shadow.

## Motion

**The catalogue turns one page, once.** The whole motion language is a single authored moment — a card's image travelling from the grid into the detail page — plus fast state feedback. There is no entrance choreography, no scroll reveal, and no stagger: this is an Operate/Read surface, and a buyer scanning forty cards does not want to wait for the page to finish performing.

### Tokens
- **`--ease-out-quart`** `cubic-bezier(0.16, 1, 0.3, 1)`: confident arrivals. The cross-page transition.
- **`--ease-out-soft`** `cubic-bezier(0.22, 0.61, 0.36, 1)`: routine state changes.
- **`--dur-feedback`** `140ms`: hover, press, focus. Must read as immediate.
- **`--dur-state`** `220ms`: selection, disclosure, thumbnail change.
- **`--dur-continuity`** `380ms`: the cross-page transition, and nothing else.

### The Shared-Element Transition
A card's image well carries `view-transition-name: card-<id>`, set through `--vt-name` on `.vt-card`. The same name exists on the grid thumbnail and on the detail page's main image, so pressing a card morphs the thumbnail into the large image instead of swapping two pages. Navigation opts in per link (`viewTransition` on the `Link`), not globally: paging, filtering, and language switching must not animate a shape that has no counterpart.

**The Name-Is-Unique Rule.** `view-transition-name` must be unique within a document. The home page's high-value strip passes `vt={false}` to `CardCard` because the same card can also appear in the grid below it, and a duplicate name makes the browser abandon the entire transition. Anything that renders a card outside its primary grid slot opts out.

### Feedback and Continuity
- **Card hover:** image `scale(1.03)` over `200ms`, border to Hairline Strong, Hover Lift. The price line never moves — a grid that shifts under the cursor reads as instability.
- **Grid change:** the result grid re-mounts on a filter or page change and plays `grid-enter` (`opacity 0→1`, `translateY(6px→0)`, `240ms`). It runs once for the grid, not per cell.
- **Row hover:** a 2px signature bar fades from transparent to Ink. The bar is always present at 2px; only its colour changes, so no text shifts sideways.
- **Status banners:** `banner-enter` (`200ms`, `-4px`), so a success or failure message does not shove the form down in one frame.
- **Submit:** the button locks its width and shows a spinner, so "提交中…" does not resize the row.

### Reduced Motion
`@media (prefers-reduced-motion: reduce)` removes displacement and duration everywhere, keeps colour and opacity feedback, and disables the view transition outright (a cross-page morph carries no information that survives without motion). `useReducedMotion` additionally stops the banner carousel's `setInterval`, which CSS cannot reach — an autoplaying loop is the one motion a media query cannot switch off. The carousel also pauses on hover and focus, and its dots remain a manual control in every mode.

**The No-Choreography Rule.** No section entrance, no scroll-driven parallax, no staggered list. If a screen needs motion to be understood, the layout is wrong first.

## Shapes

Two radius steps carry the whole interface: **8px** (`rounded-lg`) for every control — buttons, inputs, selects, pagination cells, icon buttons — and **12px** (`rounded-xl`) for every container that holds content: product cards, list containers, shop rows, empty-state boxes, the horizontal scroll strip. The banner steps up once to 16px (`rounded-2xl`) because it is a single large image. Small badges use 4px; filter chips and the rarity chip on detail pages use full-round pills. Image thumbnails inside cards use 8px.

Borders are always 1px, always a token, and always present on containers. There is no borderless card in this system — the hairline is what makes the white card readable against the near-white page.

The one recurring silhouette worth naming: the product card is a strict rectangle with a top image occupying exactly 3:4 and a text block beneath, nothing overlapping, nothing floating over the image except the banner's gradient scrim and — on a packaged card — the vault strip and its badge. The strip sits inside the image well's left edge, 4px wide, full height; it is the one element allowed to sit on top of a card photo.

### Named Rules

**The Two-Radius Rule.** 8px for things you press, 12px for things that hold content. A 16px or 20px radius on a button or input is a defect.

**The Hairline-Always Rule.** Containers get a 1px `border-border` border. Removing it to "clean up" makes white cards disappear into the page in light mode.

## Components

### Buttons
- **Shape:** 8px radius (36px tall for icon and search buttons, auto-height with 8px/16px padding for text buttons). Full-round is reserved for the hero-adjacent CTA on the 404 page and filter chips, not for ordinary actions.
- **Primary:** Seal fill, on-seal text, 14px UI type, `hover:bg-accent/90`. Used for search submit, "咨询此卡", "给我们留言", "提交留言", the active pagination cell, and error-page recovery.
- **Secondary / Outline:** Card Stock fill with a Hairline Strong border and Secondary Ink text, `hover:bg-surface-2`. Used for "返回列表", pagination arrows, and the theme/locale icon buttons.
- **Hover / Focus:** transitions are `--dur-feedback` (140ms) on color, border, and background only. Focus on inputs shifts the border to Secondary Ink (`focus:border-muted`) and removes the native outline. Explicit `focus-visible:outline-2` rings are reserved for controls a keyboard user reaches *before* they can act — the horizontal high-value strip (a scroll region), the card links in the grid, and the primary CTAs. The ring is Ink at 2px with a 2px offset, never a colour.

### Chips
- **Filter chip (unselected):** pill, Card Stock fill, Hairline Strong border, Secondary Ink, 14px.
- **Active filter chip:** pill, Card Stock fill, Hairline Strong border, Secondary Ink, 12px, with a 10px × glyph. Appears in the result header on the home page, one per active filter, and removes exactly that filter when pressed. It exists because the four selects each show only their own current value; after two changes the user cannot see what is combining to produce a short list. The result count sits in the same row, so the answer is next to the number it explains.
- **Rarity chip (detail page):** pill, Recessed Panel fill, no border, Secondary Ink, 14px.
- **State:** the filter rail itself uses native checkboxes rather than toggle chips — multi-select facets read faster as a checklist than as pills.

### Cards / Containers
- **Corner Style:** 12px.
- **Background: depends on where the card is, and this is measured, not stylistic.** In a **grid** the card has **no panel at all** — sampling the card's text block in the mockup returns the page colour (`#f5f7fa`) at 82%, so the image, name and price sit directly on the page and the image itself is the block. In the **horizontal strip** the card is Card Stock (81% white under the text block) because a scrolling row of bare images reads as unrelated loose pictures.
- **Shadow Strategy:** none at rest; `hover:shadow-md` plus a Hairline Strong border on hover — the strip variant only.
- **Border:** 1px Hairline on the strip variant; **none in the grid.**
- **Internal Padding:** 12px (`p-3`) for the product-card text block, 8px (`p-2`) in the compact variant used in the home page's horizontal strip, 12px (`p-3`) for shop rows, 16px horizontal for announcement rows.
- **Image well:** `bg-surface-2` at 3:4, `object-cover` for catalogue thumbnails, `object-contain` on the detail page so a card is never cropped.

### Inputs / Fields
- **Style:** 36px tall, 8px radius, Hairline Strong border, Card Stock fill, 16px text on mobile (iOS Safari zooms any focused input under 16px), placeholder in Weak Text.
- **Focus:** border shifts to Secondary Ink. No glow, no ring, no color change. The absence of a focus color is deliberate — the whole system has no brand hue to glow with.
- **Search field:** the placeholder is a real `<span>` layered over the input, not a `placeholder` attribute, so the hint can swap to a shorter string below `xl` instead of being clipped mid-word.
- **Error / Status:** a 15%-alpha tinted banner with matching solid text (emerald for success, red for failure), 12px radius, 14px type.
- **Required / optional marks:** 12px Weak Text with a leading `*`, never red. Red in this system means money or a failure; "required" is neither, and spending red on it leaves the error state with less contrast budget than it needs.

### Navigation
- **Header:** sticky, solid Brand Red, no border and no translucency — a shopfront, not a tool bar. Site name at 18px/700 in white (24px from `md`); nav links at 14px in white/85, `py-2` so their hit area reaches 32px, active state at white/700. The search field is a **560×40 white rounded input** followed by a separate **80×40 light-grey 检索 button** (both 4px radius, measured); then X and 店铺信息 in white, then locale and theme controls at the far right. Every control on the bar is white type on red — there are no outlined buttons on it.
- **Mobile:** below `sm` the nav collapses into a hamburger drawer and the search field moves to its own full-width row. **The language switcher stays in the top bar** — the launch market is Japan and the default language is Chinese, so hiding the one control that fixes that in a drawer is the same as not shipping it. The theme toggle stays in the drawer. The drawer's rows are 40px tall with hairline dividers.
- **Footer:** near-black ground, `pt-20`, holding two blocks at `md`: the logo at the left and a **fixed 665px "帮助中心" block at the right** (the mockup measures the heading's left edge at 535px inside the container, i.e. 665px from its right edge). Under that heading, the site links sit in a 2-column grid (`sm`: 3 columns) in Footer Link Grey, `py-1.5` for a 28px hit area. Below everything, a centred 14px white copyright line with `pb-24`. The heading-to-links gap is 56px (`mt-14`), matching the measured 57px.

### Badges
- **Pinned:** 4px radius, Price-Tag Red at 15% alpha, red text, 11px.
- **High-value:** 4px radius, High-Value Amber at 15% alpha, amber text, 11px (12px on the detail page where it sits beside the price).
- **Vault (柜藏级 / packaged):** 4px radius, Vault Purple text, 11px. On the detail page it uses the purple tint at 8% alpha, because it sits on card stock. **On a card's image well it uses a solid Card Stock fill instead** — a translucent badge over a photograph lets the photo decide the contrast, and on a pale card scan the purple text fell to about 2:1. Solid fill pins it at the token's measured 5.7:1 / 7.9:1.
- All are label-sized and never contain an icon. All sit on the 11px Micro step rather than 10px, because 10px CJK text loses stroke detail; the contrast floor (4.8:1 on their own tinted background) matters more than the extra compactness.

### The Price
The most repeated custom pattern in the system: price renders at **20px/700** in Price-Tag Red with tabular numerals (measured: the grid price "¥3,000" is a 22px-tall ink block against a 17px card name), currency symbol included, and the detail page renders it larger, right-aligned against its row's end where a rarity label sits opposite. "面议" (price on request) occupies the same slot in the same weight but in Weak Text — a card without a price must not look like a card with one.

**Yen are integers here.** Directus stores `decimal(10,2)` and the seed data arrives as `880.00`; rendering it verbatim produced `¥880.00` on every surface, which asks a buyer to strip two decimal places off every card in a grid of forty. Trading cards have no subunit in use, so all price rendering goes through `formatYen` (`lib/format.ts`), which formats with `maximumFractionDigits: 0` and thousands separators. This is display only — the stored value keeps its precision for any future averaging or fee calculation.

### The Accent Tokens
The semantic colours that used to be written as raw Tailwind palette names (`text-rose-600 dark:text-rose-400`, and so on) are now tokens — `price`, `high-value`, `pinned`, `vault`, `link`, `success`, `danger` — each with a light and dark value in one place. A component writes the token once and never repeats a `dark:` variant. That is what the Two-Theme Rule was always asking for; it is now enforced by the token set rather than by discipline.

### Announcement Surfaces
Both surfaces are now **one 12px container divided by hairlines**, and the difference between them is density rather than shape. The home page shows three rows at 44px, no trailing chevron, dates in a fixed 96px column — a short list read as a single object. The announcements index shows every row at 56px with a chevron and a hover lift on the arrow, because it is a browsable archive and every row is a destination. An earlier version gave the index one card per announcement with `hover:shadow-sm`; that made two announcements look like two unrelated objects floating on the page and contradicted Flat-At-Rest. The single container also makes the pinned bar read as a property of the list rather than of one card.

**The No-Empty-Date Rule.** A date that does not exist is not rendered as `—`. `published_at` is nullable by design (an announcement can be published immediately without a scheduled time), and a column of em dashes reads as broken data. The row simply drops the date slot; the layout does not shift because the title takes the space.

## Do's and Don'ts

### Do:
- **Do** reach for `bg-surface` / `text-fg` / `border-border` / `bg-accent` before any raw Tailwind color. The token set is the theme switch.
- **Do** verify every change in both themes at 320px and 1440px. Dark mode is a first-class state, not a filter.
- **Do** keep interactive targets at least 24px tall (WCAG 2.5.8); pagination may shrink to 28px at 320px but never below.
- **Do** put new content behind Directus. If the client would ever want to change a string or an image, it belongs in the CMS, not in a component.
- **Do** keep filters, sort, and page in the URL so a filtered view can be shared and returns intact.
- **Do** use `min-w-0` on grid and flex children that hold text; `break-words` alone does not reduce a min-content width.
- **Do** give the three language versions the same structure and the same terminology, even where a translation would be shorter.
- **Do** route every price through `formatYen`; a raw `price` value renders two decimal places the buyer has to discard.
- **Do** give a card's image well a `view-transition-name` when it appears in a grid, and pass `vt={false}` wherever the same card renders a second time on the same page.

### Don't:
- **Don't** introduce a second warm color, a gradient, or a colored glow. Price-Tag Red and High-Value Amber are the entire permission; Vault Purple is the only other accent and it may only mark `packaged` cards.
- **Don't** put a badge with a translucent background on top of a photograph. The photo decides the contrast; use a solid Card Stock fill.
- **Don't** add a shadow at rest, or a radius outside the 8/12/16/4/full set.
- **Don't** use `bg-white`, `text-slate-900`, or any raw palette name in a component — it will break dark mode.
- **Don't** shrink text below 12px except the three 11px badges.
- **Don't** use a de-emphasised colour for anything a user must read to understand why a container is empty — "暂无图片" is text, not decoration, and sits at the same value as Weak Text.
- **Don't** let a fifth type size onto a screen to solve a hierarchy problem.
- **Don't** hardcode client content (site name, shop details, announcement text, card copy) into components; the current values are placeholders and will be replaced.
- **Don't** fabricate product imagery, testimonials, or review scores to fill a layout — the page must survive with "暂无图片" in every image well.
- **Don't** reintroduce a cart, checkout, price comparison, or account surface. This is a catalogue, not a store.
- **Don't** add an entrance animation to a section, stagger a list on scroll, or animate anything on page load. The only authored motion is the card image crossing from grid to detail.
- **Don't** render a `—` for a nullable field. Drop the slot instead.
