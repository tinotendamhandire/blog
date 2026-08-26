# tinotools CRT — style guide prompt

Paste this into a new conversation when starting a related project (e.g. a blog at
`blog.tinotenda.xyz`) to carry the visual identity over. It's written as
instructions to an AI assistant, not as prose documentation.

---

## Prompt

You're building a project that should look and feel like it belongs to the same
family as **tinotools** (`tools.tinotenda.xyz`) — a black/green CRT-terminal
aesthetic. Apply the following as the design system. Don't deviate from the
palette or add illustrated/commissioned art — everything here is typography,
color, and code-drawn shapes on purpose.

### Identity

- No mascot, no illustrated logo. The brand mark is a hand-drawn chevron `>`
  (a terminal prompt), rendered as either plain CSS (a bordered box with the
  glyph centered) or drawn as a simple polygon for raster contexts (favicons,
  OG images) — never a font glyph, since bitmap/pixel fonts don't center or
  fill a small frame reliably. Full-size logo lockups are just the wordmark as
  live text, e.g. `tinotools_` with a blinking block cursor after it.
- Naming convention: lowercase, no spaces, `<product>.tinotenda.xyz` as the
  subdomain pattern.
- Voice: terse, personal, first-person, privacy-first. No tracking, no
  logins, no third-party requests — fonts and assets are self-hosted, not
  pulled from a CDN. Dry humor is fine; sincerity about the privacy stance is
  not undercut by jokes elsewhere.

### Color — two phosphor palettes, never light/cream

There is no light/pastel theme. The theme toggle switches which CRT phosphor
you're looking at, not the brightness — both are dark fields.

**Green (default, used regardless of OS color-scheme preference):**
```
background        #050a05
foreground        #33ff66
card / popover    #0b140b
primary           #33ff66  (primary-foreground #041006)
secondary         #0f2013  (secondary-foreground #7dffa0)
muted             #0c180d  (muted-foreground   #4f9f6a)
accent            #0f2013  (accent-foreground  #7dffa0)
destructive       #ff3355
border / input    #1f4d2b
ring              #33ff66
```

**Amber (opt-in only, set explicitly — never inferred from OS dark/light):**
```
background        #140d02
foreground        #ffb000
card / popover    #1c1305
primary           #ffb000  (primary-foreground #140d02)
secondary         #2b1d08  (secondary-foreground #ffcc55)
muted             #21160a  (muted-foreground   #b8802a)
accent            #2b1d08  (accent-foreground  #ffcc55)
destructive       #ff4433
border / input    #4d3313
ring              #ffb000
```

Default-to-green rule: a theme bootstrap script should add the dark/green
class unconditionally unless `localStorage.theme === "light"` was explicitly
set by a toggle. Never branch on `prefers-color-scheme` for the default —
only an explicit user choice opts into amber.

Never introduce a third accent color (no stray yellow/orange badges, no
off-palette warning colors) — reuse `destructive` for anything that needs to
stand out as a warning (beta tags, alerts), and `primary` for anything
"featured" or emphasized. If two things need to be visually distinct, vary
weight/border/opacity, not hue.

### Typography

- **VT323** (SIL Open Font License, self-hosted — pull the `.ttf`/`.woff2`
  from `google/fonts` on GitHub, don't link Google Fonts' CDN), single weight
  400. Used as the *only* typeface, `font-mono` for everything — no separate
  sans/serif.
- VT323 has a small apparent x-height. Scale the root `font-size` up
  (`html { font-size: 118%; }`) rather than bumping every Tailwind text-size
  utility individually.
- Headings (`h1`–`h3`) get a soft glow: `text-shadow: 0 0 8px color-mix(in
  oklch, var(--foreground) 45%, transparent);`. Body text stays glow-free for
  legibility in dense UI.
- Square corners everywhere (`radius: 0`), hairline `1px` borders, flush/dense
  spacing. `rounded-full` is fine for pills/switches/avatars — nothing else
  gets a border-radius.

### CRT effects (subtle, always accessibility-gated)

- **Scanlines**: a fixed, full-viewport `::before` overlay, low-alpha
  repeating horizontal lines (`rgb(0 0 0 / 0.09)`, 1px line / 3px repeat).
  Static — not animated — so it's always present regardless of motion
  preference.
- **Flicker**: a `::after` overlay that pulses opacity very slightly
  (0 → 0.025 → 0 → 0.018) on a slow ~6.5s cycle, using `var(--foreground)` as
  the flash color. Wrapped entirely in
  `@media (prefers-reduced-motion: no-preference)` — omitted outright under
  reduced motion, not just slowed down.
- **Cursor blink**: a trailing `_` after a wordmark, `steps(1)` blink
  animation, 1s cycle. Same reduced-motion gating — render static/visible
  (not hidding it) when motion is off.
- Keep effects decorative-only: never let them reduce contrast on
  interactive/dense UI (forms, tables, calculators). If in doubt, lower the
  opacity further rather than removing legibility margin.

### What NOT to do

- Don't commission or generate illustrated character art for logos, icons, or
  decorative stickers/graphics. If a piece of chrome needs a mark, it's
  either the text wordmark or the `>` chevron — both fully code-drawn.
  (History here: an earlier version of tinotools had a hand-drawn mascot with
  the old product name lettered directly into the pixels across ~60 images —
  expensive to redo and impossible to text-search/rename. Don't repeat that
  mistake: any brand text belongs in HTML/CSS, never baked into a raster.)
- Don't use `prefers-color-scheme` to choose the default theme.
- Don't introduce rounded corners, drop shadows as a primary design element,
  or a second typeface.
