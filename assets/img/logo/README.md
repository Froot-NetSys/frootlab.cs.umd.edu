# FROOT Lab logo

Wordmark on a Calvert rule, closed by a berry cluster. The bars come from the
Maryland state flag (Calvert arms), which is state heraldry in the public
domain — no official University of Maryland mark is used or modified anywhere
in these files. The berries are a play on the lab's name; they replaced an
earlier cross bottony node, so the Crossland arms no longer appear.

## Files

| File | Use |
|---|---|
| `frootlab-primary.svg` | Default lockup, with the descriptor line. About pages, print, slide title cards. |
| `frootlab-compact.svg` | Site header. Same lockup, descriptor removed. |
| `frootlab-stacked.svg` | Centred, node on top. Footers, posters, square placements. |
| `frootlab-mono.svg` | One ink. Grayscale print, fax-grade reproduction, embroidery, engraving. |
| `frootlab-reversed.svg` | Dark backgrounds. Transparent background, so it looks blank in a white viewer — that's expected. |
| `frootlab-mark.svg` | Standalone berry mark, 64px grid. Use at 24px and up. |
| `frootlab-mark-16.svg` | Standalone mark redrawn on a 16px grid with the leaf dropped. Use at 20px and below. |
| `frootlab-mark-bare.svg` | Berry cluster with no tile, for inline use on light backgrounds. |

## Before this goes live: outline the type

The wordmark is still live `<text>` with a font stack of IBM Plex Sans, Inter,
Manrope, Helvetica, Arial. That means it renders differently on a machine missing those
fonts, which is not acceptable for a logo. Pick the typeface, install it, then
convert to paths:

```sh
inkscape --export-type=svg --export-plain-svg --export-text-to-path \
  -o frootlab-primary-outlined.svg frootlab-primary.svg
```

Run it on a machine that has the chosen font installed, and commit the outlined
files as the shipping assets. Keep the live-text versions in the repo as the
editable masters.

The wordmark uses `textLength="240" lengthAdjust="spacing"`, which forces it to
exactly the width of the rule in any typeface. `font-size` is therefore the only
tuning knob: raising it makes the glyphs larger and the tracking tighter, since
they still have to fill 240 units. Never change the `textLength` — the rule and
the wordmark must stay the same width.

Currently set to 48. The wordmark reads "FROOT Lab" in caps, which is far wider
per character than the old lowercase "frootlab", so 48 is where it sits at
roughly natural tracking inside the 240-unit rule. Above about 52 the letters
begin to compress into each other; below about 44 the wordmark looks lost
against the rule.

## Clear space and minimum size

Clear space is already baked into each artboard as padding, equal to the cap
height of the wordmark. Don't crop it out, and don't place other elements inside
it.

- Compact lockup: minimum 190px wide. Below that the rule segments stop resolving.
- Primary lockup: minimum 260px wide, or the descriptor line becomes unreadable.
- Mark: 16px minimum, using `frootlab-mark-16.svg`.

Never scale the wordmark and the rule independently.

## Colors

| | Hex |
|---|---|
| Indigo (primary) | `#6366F1` |
| Soft indigo (accent) | `#A5B4FC` |
| Ink | `#0F172A` |
| Descriptor gray | `#64748B` |

These match the site's `--sl-primary`, `--sl-accent`, `--sl-ink`, and
`--sl-text-muted` tokens in `assets/css/style.css`. The bars and cross keep the
Maryland flag geometry; only the colors changed.

On a dark background the ink has to flip to white, which is what
`frootlab-reversed.svg` does. If you'd rather the lockup follow the surrounding
text color automatically, replace `fill="#0F172A"` with `fill="currentColor"`
and `stroke="#0F172A"` with `stroke="currentColor"`.

## Favicon

```html
<link rel="icon" href="/assets/logo/frootlab-mark.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32">
<link rel="icon" href="/favicon-16.png" sizes="16x16">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

Generate the PNG fallbacks from the marks — 16px from the 16px grid file, the
rest from the full one:

```sh
rsvg-convert -w 16  -h 16  frootlab-mark-16.svg -o ../favicon-16x16.png
rsvg-convert -w 32  -h 32  frootlab-mark.svg    -o ../favicon-32x32.png
rsvg-convert -w 180 -h 180 frootlab-mark.svg    -o ../favicon-180x180.png
```

## Approval

Worth clearing with Alan and with UMD Strategic Communications before launch.
Unit-level marks on a `umd.edu` domain fall under the university identity
policy even when they use no official university artwork, and the Calvert bars
are the part most likely to draw a question. Check the current brand
guide for a specified typeface too — matching it makes the conversation shorter.
