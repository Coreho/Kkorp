# Alternate palettes, October 2026

TASK-007. Four palettes for the site: today's, two dark alternates that keep
the glass-and-jelly character, and one light option. Each is defined as
semantic tokens in [`palettes.json`](palettes.json), rendered on the real site
rather than drawn, and measured.

Rendered on 2026-10-26 from https://koreokorp.com with
`node scripts/palette-capture.mjs`. The script injects each palette as a
stylesheet of token overrides, then captures the landing and the open About
panel at 1280 × 800 and 390 × 844, and the Lobby at 1280 × 800. Images and
numbers are in [`docs/evidence/palettes/`](../evidence/palettes/), with the
numbers in `contrast.json`. The sample badge is hidden in every capture so it
does not dominate (the site review's R1 removes it).

## The palettes

Panel accents are listed in order: About, Blog, Projects, Lobby.

| Token | Indigo Night (today) | Plum Dusk | Terminal Mint | Paper Day (light) |
| --- | --- | --- | --- | --- |
| Page | `#000000` | `#0b0610` | `#010605` | `#f3f0e8` |
| Surface | `#0c0c12` | `#160c1b` | `#07110e` | `#fffdf8` |
| Text | `#ffffff` | `#fff7f2` | `#f0fff9` | `#17141f` |
| Soft text | `#d4d4d8` | `#eadcd6` | `#cfe8de` | `#37323f` |
| Muted text | `#a1a1aa` | `#b9a5b0` | `#8fb4a6` | `#5b5566` |
| Primary | `#4b4ba0` | `#9b3f78` | `#1d7a63` | `#4040a0` |
| Secondary | `#8f47ae` | `#a8572a` | `#2a6aa0` | `#7a3a98` |
| Accent | `#67e8f9` | `#ffb38a` | `#5eead4` | `#0e7490` |
| Focus | `#a5b4fc` | `#ffcfa8` | `#99f6e4` | `#4040a0` |
| Success | `#3ddc84` | `#5fd39a` | `#4ade80` | `#15803d` |
| Warning | `#fbbf24` | `#f5c04f` | `#fcd34d` | `#92400e` |
| Danger | `#f87171` | `#ff8597` | `#fb7185` | `#b91c1c` |
| Panel accents | `#7777ff` `#4b4ba0` `#c563e8` `#67e8f9` | `#ff8fb1` `#c75a96` `#e39a5c` `#ffb38a` | `#5eead4` `#34b394` `#7dd3fc` `#a3e635` | `#4040a0` `#5b3fa0` `#7a3a98` `#0e7490` |

- **Indigo Night** is the site today. It is listed as the baseline, and it has
  one contrast failure (below).
- **Plum Dusk** is warm late-evening glass: plum surfaces, rose and amber light.
- **Terminal Mint** grows the Projects panel's green `C:\>` monitor into a
  palette: green-black glass, mint and sky.
- **Paper Day** is warm paper with dark ink and the same indigo, for visitors
  whose system asks for a light page.

## Mockups

| Palette | Landing | About, desktop | About, phone | Lobby |
| --- | --- | --- | --- | --- |
| Indigo Night | [desktop](../evidence/palettes/indigo-night-desktop-landing.jpg), [phone](../evidence/palettes/indigo-night-phone-landing.jpg) | [about](../evidence/palettes/indigo-night-desktop-about.jpg) | [about](../evidence/palettes/indigo-night-phone-about.jpg) | [lobby](../evidence/palettes/indigo-night-desktop-lobby.jpg) |
| Plum Dusk | [desktop](../evidence/palettes/plum-dusk-desktop-landing.jpg), [phone](../evidence/palettes/plum-dusk-phone-landing.jpg) | [about](../evidence/palettes/plum-dusk-desktop-about.jpg) | [about](../evidence/palettes/plum-dusk-phone-about.jpg) | [lobby](../evidence/palettes/plum-dusk-desktop-lobby.jpg) |
| Terminal Mint | [desktop](../evidence/palettes/terminal-mint-desktop-landing.jpg), [phone](../evidence/palettes/terminal-mint-phone-landing.jpg) | [about](../evidence/palettes/terminal-mint-desktop-about.jpg) | [about](../evidence/palettes/terminal-mint-phone-about.jpg) | [lobby](../evidence/palettes/terminal-mint-desktop-lobby.jpg) |
| Paper Day | [desktop](../evidence/palettes/paper-day-desktop-landing.jpg), [phone](../evidence/palettes/paper-day-phone-landing.jpg) | [about](../evidence/palettes/paper-day-desktop-about.jpg) | [about](../evidence/palettes/paper-day-phone-about.jpg) | [lobby](../evidence/palettes/paper-day-desktop-lobby.jpg) |

## Contrast

WCAG 2.1 ratios, computed from the tokens. Text needs 4.5:1 (AA, normal size);
focus rings and other non-text UI need 3:1.

| Pair | Needs | Indigo Night | Plum Dusk | Terminal Mint | Paper Day |
| --- | --- | --- | --- | --- | --- |
| Text on page | 4.5 | 21.00 | 18.93 | 19.79 | 15.95 |
| Text on surface | 4.5 | 19.50 | 17.99 | 18.60 | 17.87 |
| Soft text on surface | 4.5 | 13.19 | 14.25 | 14.83 | 12.22 |
| Muted text on surface | 4.5 | 7.61 | 8.23 | 8.44 | 7.04 |
| White on primary (active section) | 4.5 | 7.46 | 6.22 | 5.23 | 8.54 |
| White on secondary (end of the section pill) | 4.5 | 5.71 | 5.17 | 5.73 | 7.28 |
| Accent on surface | 3 | 13.45 | 10.94 | 12.96 | 5.27 |
| Focus on surface | 3 | 9.78 | 13.37 | 15.20 | 8.40 |
| Focus on page | 3 | 10.53 | 14.07 | 16.18 | 7.50 |
| Success on surface | 4.5 | 10.93 | 10.22 | 11.00 | 4.93 |
| Warning on surface | 4.5 | 11.68 | 11.37 | 13.29 | 6.97 |
| Danger on surface | 4.5 | 7.05 | 8.21 | 7.12 | 6.36 |
| About accent on surface | 4.5 | 5.45 | 8.90 | 12.96 | 8.40 |
| **Blog accent on surface** | 4.5 | **2.61** | 4.84 | 7.32 | 7.76 |
| Projects accent on surface | 4.5 | 5.87 | 8.20 | 11.50 | 7.16 |
| Lobby accent on surface | 4.5 | 13.45 | 10.94 | 12.71 | 5.27 |

Panel accents need 4.5:1 because each panel colours its small section number
("02") with its accent.

**Indigo Night fails today.** The Blog section number is `#4b4ba0` on the panel
at 2.61:1, which fails even the 3:1 large-text bar. That failure is live on the
site now. Raising the Blog accent to `#7a7ae0` gives 5.28:1 and keeps the hue.
It is one line in `app/globals.css` (`.p2 { --accent-rgb: … }`), with no
JavaScript, and is worth doing whichever palettes ship.

Plum Dusk's first secondary, `#b8612e`, put white pill text at 4.39:1. It was
darkened to `#a8572a` (5.17:1) before these captures.

Body text measured on the rendered pixels of each capture (the About text and
its timeline rows, darkest against lightest pixel) agrees with the token
ratios:

| Element | Indigo Night | Plum Dusk | Terminal Mint | Paper Day |
| --- | --- | --- | --- | --- |
| About text, desktop | 10.42 | 11.60 | 12.08 | 6.13 |
| Timeline row, desktop | 9.39 | 9.19 | 9.32 | 4.73 |
| About text, phone | 11.29 | 12.54 | 12.97 | 7.38 |

Rendered ratios sit below the token ratios in every palette, because
antialiased text never reaches its full colour. Dark text on a light page loses
more that way, so Paper Day measures lowest. Every ratio stays above 4.5:1.

## The Lobby and the logo

- **The Lobby** keeps its Windows 2000 window (`--w-*` tokens) in every
  palette. It is a deliberate period piece; recolouring it would break the
  joke, and its own contrast does not depend on the page. Only the panel's
  border and glow follow the Lobby accent.
  - In Paper Day, a dark band shows behind the window, because
    `.p4 .bg` hard-codes `rgba(12, 12, 18, .3)`
    ([paper-day-desktop-lobby](../evidence/palettes/paper-day-desktop-lobby.jpg)).
- **The logo artwork** (cream letters, dark-brown outline, blue edge) reads on
  all four palettes, including Paper Day's light page
  ([paper-day-desktop-landing](../evidence/palettes/paper-day-desktop-landing.jpg)).
- **The jelly's thought and chat bubbles** stay the signature purple and pink
  in every palette, because the jelly engine hard-codes its colours.
  - They suit Indigo Night, sit well enough in Plum Dusk, and are the one
    off-palette note in Terminal Mint.
  - Theming them would be a JavaScript change.

## What shipping each would take

The theme switcher itself (TASK-008) is JavaScript. The home page has 70 bytes
of its 620 KiB budget left (measured on 2026-10-26), so any switcher needs
room made first: remove code (for example the review's R2) or raise the cap.

| Palette | Work beyond the switcher |
| --- | --- |
| Indigo Night | None (it is the default). Fix the Blog accent. |
| Plum Dusk, Terminal Mint | CSS only. The tokens, plus about ten hard-coded accents (section pill gradient, focus ring, landing gradients, selection, landing hint); `palette-capture.mjs` shows the full set in about 25 lines per palette. |
| Paper Day | Everything above, plus: |

For Paper Day the extra work is:

- 21 rules that hard-code white text.
- White glass lines and fills (`rgba(255, 255, 255, …)`).
- The dark `.p4 .bg` band behind the Lobby.
- Colours in the dot field and screensaver engines, which draw light dots for a
  dark page. They are inverted in these mockups as a stand-in.
- A no-flash script that sets the theme before first paint, for TASK-008 AC#2.

## Recommendation

1. **Fix Indigo Night's Blog accent now** (`#7a7ae0`), independent of themes.
2. **If the owner wants alternates, ship Terminal Mint first, then Plum
   Dusk.**
   - Both are CSS-only, pass AA everywhere, and keep the site's glass and glow.
   - Terminal Mint has the stronger identity because it grows out of an
     element the site already has.
   - Both need room in the JavaScript budget for the switcher.
3. **Ship Paper Day only with TASK-008's full tokenization.** It is the option
   `prefers-color-scheme: light` would select, which is what makes TASK-008's
   "respect the system preference" meaningful. It is also the most work. Until
   then, a light-preferring visitor keeps getting Indigo Night, as today.

The owner chooses which palettes ship. TASK-008 then implements only those.
