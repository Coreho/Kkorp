# KoreoKorp V2 mockup

A single-file, clickable mockup of the KoreoKorp V2 homepage. Open `index.html` in a browser; no build step.
All content is sample data and the chat room is scripted (no backend yet).

## What's in it

- **Four panels** (KoreoKorp, Blog, Projects, Chat room) based on the "Future Workspaces" layout. Click a panel to expand it; Esc or ✕ closes it.
- **One morphing shape for the whole site**: a single solid, jelly-edged shape shows where you are. It's a K at home, a page in the Blog, a hexagon node in Projects and a pink speech bubble (with typing dots) on the chat window. Changing place makes it glide across the panel borders, stretching in the direction it travels, and melt into the next icon. Click it at home to splat and spin it. Each chat message sends a droplet off the shape. Hover does nothing.
- **KoreoKorp panel**: rotating live captions (last speaker, people online) and About content (timeline and links are placeholders).
- **Blog panel**: self-writing page that cascades on hover; opened, it fills the screen and scrolls slowly with yellow highlights.
- **Projects panel**: draggable node graph; click empty space to add a node.
- **Chat room**: AIM-style window, screen-name sign-on (remembered in localStorage), two scripted bots (DialUpDan, Y2Kpixie; placeholder personas).
  Commands: `/help`, `/spell WORD` (puts a word in the front-page caption), `/party`, `/buzz`, `/away MESSAGE`, `/screensaver`.
- **Screensaver** after 25 s idle: bouncing pixel wordmark with a corner-hit counter.
- **Secret**: ↑↑↓↓←→←→ B A.

## Not done yet

Real chat (Supabase Realtime), OpenRouter bots, the `/admin` blog editor, and the Next.js + Vercel build.
