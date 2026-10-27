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
  price-tag-red: "#ec003f"
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

**Creative North Star: "The Quiet Catalogue"**

This interface is a card catalogue you can flip through: entries on cool paper, one hairline per boundary, and a price tag that is the only warm thing on the page. It does not sell with decoration — it sells by being legible. Every screen answers the same three questions in the same order: which card is this, what does it cost, what condition is it in. Ornament that does not serve those three answers is not part of the system.

The palette is deliberately cold: slate paper, white card stock, slate ink, and a single red reserved for money. Because there is no second warm hue anywhere, the price is impossible to miss without being loud — the restraint is what makes it work. Dark mode is not an inverted theme bolted on; it is the same catalogue read under a lamp, with the same hairline logic and the same single red, lifted one step to stay readable on night paper.

The build is dense but never cramped: 14px UI type carries most of the interface, containers step to 16px only where a card is a real destination, and the whole grid breathes at 16px gutters. Density is honest here — a buyer scanning forty cards does not want whitespace theatre. What keeps that density from feeling cheap is total consistency: one radius for controls, one for containers, one border weight, one shadow that only appears on hover.

**Key Characteristics:**
- One accent family (red) used only for money and "pinned"; everything else is slate.
- Flat at rest. No shadow, no gradient, no glow as decoration.
- Two radius steps (8px controls, 12px containers) plus pills for chips and full-round for small badges.
- System font stack; hierarchy built from weight and size, never from a second typeface.
- Hairline borders separate everything; color fills are rare and always semantic.
- Light and dark are the same design, one step apart in lightness.

## Colors

A cold slate ledger, interrupted exactly twice: red for price, amber for "high value buyback".

### Primary
- **Seal** (`--color-accent`, `#0f172a` / dark `#e2e8f0`): the fill of every primary action. In light mode it is the same near-black as the headline ink, so the primary button reads as "the most solid object on screen" rather than as a branded hue. In dark mode it inverts to near-white. Search submit, "inquire", "contact us", the active page number, and the primary button on error pages all use it.
- **Price-Tag Red** (`#ec003f` light / `#ff637e` dark): money, and pinned announcements. Nothing else. It is the only warm color permitted on more than one screen.

### Secondary
- **High-Value Amber** (`#9a5b00` light / `#ffb900` dark): the "高价买取 / high value buyback" badge and its tinted background at 15% alpha. Signals a card the shop pays premium for; never used for ordinary prices. The light-mode value is darker than the raw amber because the badge text sits on that same amber at 15% — the original `#e17100` measured 2.85:1 there.

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

**The Ink-Is-The-Button Rule.** Primary actions fill with ink, never with a brand hue. There is no brand color to spend on a button — the catalogue's authority comes from black type, not from a colored pill.

**The Two-Theme Rule.** Every color decision is made twice, from the same token names, in `@theme` and in `html.dark`. A raw Tailwind color name (`text-slate-500`, `bg-white`) inside a component is a defect: it will not follow the theme. For the accent family this is now structural — `text-price`, `text-high-value`, `text-pinned`, `text-link`, `text-success`, `text-danger` — so the component never writes a `dark:` colour variant at all.

## Typography

**Display Font:** none — the system stack, used at headline weight
**Body Font:** `system-ui`, falling back to `-apple-system, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif`

**Character:** Invisible and fast. The stack resolves to SF on Apple hardware, Segoe on Windows, and PingFang / Hiragino / YaHei for Chinese and Japanese — which matters because this product ships three languages and must never depend on a downloaded webfont to look right. Hierarchy is done entirely with size and weight: nothing is ever italic, nothing is ever letter-spaced for effect, and uppercase is never used.

### Hierarchy
- **Numeral Display** (900, 60px/1, tabular): only on the 404 and 500 pages, in Weak Text. A deliberate single moment of scale in an otherwise 14–24px product; it must read as a number, not as a ghost.
- **Headline** (700, 24px/32px): page titles — card name on the detail page, announcement title, info-page title, section title on the shops page.
- **Title** (600, 18px/28px): section headings inside the home page ("通知公告", "高价买取", "最新上架"), the site name in the header.
- **Body** (400, 16px/24px): rich-text announcement and info-page copy at `line-height: 1.75` inside `.prose`, card descriptions, the footer's data notice.
- **UI** (400–600, 14px/20px): the workhorse. Nav links, buttons, inputs, filter labels, table-ish metadata, announcement rows. This is the size most of the interface is set in.
- **Caption** (400, 12px/16px): card numbers, dates, counts, footer legal links, the shop address line.
- **Micro** (400–500, 11px/15px): the two badges only — "置顶" and "高价买取". Nothing else may be smaller than 12px.

### Named Rules

**The No-Display-Type Rule.** There is no display face and no webfont. If a hierarchy problem seems to need a new typeface, it needs a weight or size change instead.

**The Four-Size Rule.** Any given screen uses at most four type sizes: 24, 18, 14, 12 (plus 11 only for badges). A fifth size on one screen means the hierarchy is being solved by accident.

**The Truncate-Once Rule.** Card names truncate with `truncate` in lists and wrap with `break-words` on detail pages. Detail-page headings, `.prose` bodies, and shop names must never overflow their column.

## Layout

A single 1152px (`max-w-6xl`) column with 16px side padding, on every page. The header is sticky, 56px tall, and grows to ~109px below 1024px because the search field and its two icons move to a second row rather than being squeezed into the first.

The home page is a vertical rhythm of `space-y-10` (40px) sections, each led by a Title-weight heading with a "全部 →" link pushed right. The banner is the only element with a large radius (16px) and the only element that bleeds to a fixed 21:9 aspect.

List pages use a two-column split: a 260px filter rail that becomes sticky at `lg` and collapses behind an "展开/收起" button below it, plus a `minmax(0,1fr)` content column. The product grid inside is 2 columns on phones, 3 at `sm`, 4 at `lg`, with `gap-4` (16px). Cards are `aspect-[3/4]` images over a 12px-padded text block.

Detail pages are a 1:1 split from `md` up, with the image column in a 3:4 well and the text column carrying the breadcrumb, name, code, price row, a two-up definition list, description, and two actions.

The shops page is `minmax(280px,380px)` list + `minmax(0,1fr)` map from `lg`; on phones the map comes first, then the rows. Both columns carry `min-w-0` — without it, a long unbroken address or card name pushes the grid wider than the viewport.

Breakpoints in use: `min-[360px]` (pagination step-down), `sm` 640, `md` 768, `lg` 1024, `xl` 1280. The 320px viewport is treated as a real target, not an edge case.

## Elevation & Depth

**Flat at rest.** Nothing in this system floats. Depth is communicated by three flat devices: a 1px hairline border, one step of background tint (Card Stock over Cool Paper, Recessed Panel inside Card Stock), and — on hover only — a small shadow. That is the entire vocabulary.

The header is the one exception that is not depth but translucency: `bg-surface/90` with `backdrop-blur`, so content passing under it stays faintly visible. It is the only backdrop filter in the product.

### Shadow Vocabulary
- **Hover Lift** (`hover:shadow-md`, Tailwind default `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): product cards only, on hover. Confirms "this is a link" without lifting anything at rest.
- **Selected Row** (`shadow-sm`): the currently selected shop row, paired with a border that shifts to Ink. The shadow is a secondary cue; the border is the real signal.

### Named Rules

**The Flat-At-Rest Rule.** No shadow, glow, or gradient at rest. If a surface needs to be distinguished, change its border or its tint, not its elevation.

**The Border-Or-Tint Rule.** Every "these are separate things" moment resolves to either a 1px hairline or one step of background tint. Never both, never a shadow.

## Shapes

Two radius steps carry the whole interface: **8px** (`rounded-lg`) for every control — buttons, inputs, selects, pagination cells, icon buttons — and **12px** (`rounded-xl`) for every container that holds content: product cards, list containers, shop rows, empty-state boxes, the horizontal scroll strip. The banner steps up once to 16px (`rounded-2xl`) because it is a single large image. Small badges use 4px; filter chips and the rarity chip on detail pages use full-round pills. Image thumbnails inside cards use 8px.

Borders are always 1px, always a token, and always present on containers. There is no borderless card in this system — the hairline is what makes the white card readable against the near-white page.

The one recurring silhouette worth naming: the product card is a strict rectangle with a top image occupying exactly 3:4 and a text block beneath, nothing overlapping, nothing floating over the image except the banner's gradient scrim.

### Named Rules

**The Two-Radius Rule.** 8px for things you press, 12px for things that hold content. A 16px or 20px radius on a button or input is a defect.

**The Hairline-Always Rule.** Containers get a 1px `border-border` border. Removing it to "clean up" makes white cards disappear into the page in light mode.

## Components

### Buttons
- **Shape:** 8px radius (36px tall for icon and search buttons, auto-height with 8px/16px padding for text buttons). Full-round is reserved for the hero-adjacent CTA on the 404 page and filter chips, not for ordinary actions.
- **Primary:** Seal fill, on-seal text, 14px UI type, `hover:bg-accent/90`. Used for search submit, "咨询此卡", "给我们留言", "提交留言", the active pagination cell, and error-page recovery.
- **Secondary / Outline:** Card Stock fill with a Hairline Strong border and Secondary Ink text, `hover:bg-surface-2`. Used for "返回列表", pagination arrows, and the theme/locale icon buttons.
- **Hover / Focus:** transitions are the default 150ms `cubic-bezier(0.4,0,0.2,1)` on color and background only. Focus on inputs shifts the border to Secondary Ink (`focus:border-muted`) and removes the native outline; the one explicit focus ring in the product is the `focus-visible:outline-2` on the horizontal high-value strip, because it is a scroll region keyboard users must reach first.

### Chips
- **Filter chip (unselected):** pill, Card Stock fill, Hairline Strong border, Secondary Ink, 14px. Used for the IP shortcuts on the home page.
- **Rarity chip (detail page):** pill, Recessed Panel fill, no border, Secondary Ink, 14px.
- **State:** the filter rail itself uses native checkboxes rather than toggle chips — multi-select facets read faster as a checklist than as pills.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** Card Stock over Cool Paper; Night Card over Night Paper.
- **Shadow Strategy:** none at rest; `hover:shadow-md` plus a Hairline Strong border on hover (see Elevation).
- **Border:** 1px Hairline, always.
- **Internal Padding:** 12px (`p-3`) for the product-card text block, 8px (`p-2`) in the compact variant used in the home page's horizontal strip, 12px (`p-3`) for shop rows, 16px horizontal for announcement rows.
- **Image well:** `bg-surface-2` at 3:4, `object-cover` for catalogue thumbnails, `object-contain` on the detail page so a card is never cropped.

### Inputs / Fields
- **Style:** 36px tall, 8px radius, Hairline Strong border, Card Stock fill, 16px text on mobile (iOS Safari zooms any focused input under 16px), placeholder in Weak Text.
- **Focus:** border shifts to Secondary Ink. No glow, no ring, no color change. The absence of a focus color is deliberate — the whole system has no brand hue to glow with.
- **Search field:** the placeholder is a real `<span>` layered over the input, not a `placeholder` attribute, so the hint can swap to a shorter string below `xl` instead of being clipped mid-word.
- **Error / Status:** a 15%-alpha tinted banner with matching solid text (emerald for success, red for failure), 12px radius, 14px type.

### Navigation
- **Header:** sticky, translucent Card Stock over a Hairline bottom border. Site name at 18px/600; nav links at 14px in Secondary Ink, `py-2` so their hit area reaches 32px, active state at Ink/600. A single search field with a Seal submit button, then two icon-only shortcuts (X, shop), then locale and theme controls pushed to the far right and visually de-emphasized.
- **Mobile:** below `sm` the nav and both preference controls collapse into a hamburger drawer, and the search field moves to its own full-width row. The drawer's rows are 40px tall with hairline dividers.
- **Footer:** three text blocks at `lg` (intro, contact, data notice), collapsing to one column on phones; then a hairline-separated row of site links (contact + the four compliance info pages) with `py-1.5` to lift each link to a 28px hit area, then a centered 12px copyright line.

### Badges
- **Pinned:** 4px radius, Price-Tag Red at 15% alpha, red text, 11px.
- **High-value:** 4px radius, High-Value Amber at 15% alpha, amber text, 11px (12px on the detail page where it sits beside the price).
- Both are label-sized and never contain an icon. Both sit on the 11px Micro step rather than 10px, because 10px CJK text loses stroke detail; the contrast floor (4.8:1 on their own tinted background) matters more than the extra compactness.

### The Price
The most repeated custom pattern in the system: price renders at 16px/600 in Price-Tag Red with tabular numerals (detail page: 24px/600), currency symbol included, right-aligned against its row's end where a rarity label sits opposite. "面议" (price on request) occupies the same slot in the same weight but in Weak Text — a card without a price must not look like a card with one.

### The Accent Tokens
The four semantic colours that used to be written as raw Tailwind palette names (`text-rose-600 dark:text-rose-400`, and so on) are now tokens — `price`, `high-value`, `pinned`, `link`, `success`, `danger` — each with a light and dark value in one place. A component writes the token once and never repeats a `dark:` variant. That is what the Two-Theme Rule was always asking for; it is now enforced by the token set rather than by discipline.

### Announcement Surfaces
Two shapes exist, and they are deliberately different. On the home page, notices sit in **one** 12px container divided by hairlines, each row 16px-padded — a short list read as a single object. On the announcements index page, each announcement is its own 8px-radius card with 16px/12px padding and `hover:shadow-sm`, because that page is a browsable archive where entries are independent destinations. Neither is a mistake; the difference tracks "summary of three" versus "list of many".

## Do's and Don'ts

### Do:
- **Do** reach for `bg-surface` / `text-fg` / `border-border` / `bg-accent` before any raw Tailwind color. The token set is the theme switch.
- **Do** verify every change in both themes at 320px and 1440px. Dark mode is a first-class state, not a filter.
- **Do** keep interactive targets at least 24px tall (WCAG 2.5.8); pagination may shrink to 28px at 320px but never below.
- **Do** put new content behind Directus. If the client would ever want to change a string or an image, it belongs in the CMS, not in a component.
- **Do** keep filters, sort, and page in the URL so a filtered view can be shared and returns intact.
- **Do** use `min-w-0` on grid and flex children that hold text; `break-words` alone does not reduce a min-content width.
- **Do** give the three language versions the same structure and the same terminology, even where a translation would be shorter.

### Don't:
- **Don't** introduce a second warm color, a gradient, or a colored glow. Price-Tag Red and High-Value Amber are the entire permission.
- **Don't** add a shadow at rest, or a radius outside the 8/12/16/4/full set.
- **Don't** use `bg-white`, `text-slate-900`, or any raw palette name in a component — it will break dark mode.
- **Don't** shrink text below 12px except the two 11px badges.
- **Don't** use a de-emphasised colour for anything a user must read to understand why a container is empty — "暂无图片" is text, not decoration, and sits at the same value as Weak Text.
- **Don't** let a fifth type size onto a screen to solve a hierarchy problem.
- **Don't** hardcode client content (site name, shop details, announcement text, card copy) into components; the current values are placeholders and will be replaced.
- **Don't** fabricate product imagery, testimonials, or review scores to fill a layout — the page must survive with "暂无图片" in every image well.
- **Don't** reintroduce a cart, checkout, price comparison, or account surface. This is a catalogue, not a store.
