# KoreoKorp V2 mockup

A single-file, clickable mockup of the KoreoKorp V2 homepage. Open `index.html` in a browser; no build step.
All content is sample data and the chat room is scripted (no backend yet).

## What's in it

- **Four panels** (KoreoKorp, Blog, Projects, Chat room) based on the "Future Workspaces" layout. Click a panel to expand it; Esc or ✕ closes it.
- **One shared set of letter tiles for the whole site**: the word is cut into crisp square tiles. They form the KoreoKorp wordmark at home; opening a panel makes them lift, slide and spin across the panel borders and lock into BLOG / WORK (tiles whose letter piece changes flip like cards). In the chat they become a pink mosaic frame with a chase light, and each chat message is delivered by a few tiles. Click the wordmark to scramble it and watch it re-solve. Hover does nothing.
- **KoreoKorp panel**: rotating live words (last speaker, people online), a "Spell something" box, About content (timeline and links are placeholders).
- **Blog panel**: self-writing page that cascades on hover; opened, it fills the screen and scrolls slowly with yellow highlights.
- **Projects panel**: draggable node graph; click empty space to add a node.
- **Chat room**: AIM-style window, screen-name sign-on (remembered in localStorage), two scripted bots (DialUpDan, Y2Kpixie; placeholder personas).
  Commands: `/help`, `/spell WORD`, `/party`, `/buzz`, `/away MESSAGE`, `/screensaver`.
- **Screensaver** after 25 s idle: bouncing pixel wordmark with a corner-hit counter.
- **Secret**: ↑↑↓↓←→←→ B A.

## Not done yet

Real chat (Supabase Realtime), OpenRouter bots, the `/admin` blog editor, and the Next.js + Vercel build.
