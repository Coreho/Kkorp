# KoreoKorp V2 mockup

A single-file, clickable mockup of the KoreoKorp V2 homepage. Open `index.html` in a browser; no build step.
All content is sample data and the chat room is scripted (no backend yet).

## What's in it

- **Landing page**: the KoreoKorp logo, large and centred. Click it to enter: it glides up, shrinks and docks as the header logo on the tabs page. Click the docked logo to go back to the landing page.
- **Four panels** (About, Blog, Projects, Chat room) based on the "Future Workspaces" layout. Click a panel to expand it; Esc or ✕ closes it. With the Blog open, About and Projects stay as slim clickable tabs on its left and right.
- **Jelly shapes**: the logo is a solid, jelly-edged shape traced from the logo artwork (the artwork fades in on top when it settles). Opening Blog, Projects or Chat pops a second jelly shape out of the logo that flies to the tab and becomes its icon: a page, an old computer with a blinking `C:\>`, a pink speech bubble with typing dots. Closing the tab pulls it back into the logo. Shapes stretch as they travel; each chat message sends a droplet from the logo. Hover does nothing.
- **About panel**: when opened, a stick figure walks in, scratches its head and asks "Koreokorp?" (click it for more questions). Also rotating live captions (last speaker, people online) and About content (timeline and links are placeholders).
- **Blog panel**: self-writing page that cascades on hover; opened, it fills the screen and scrolls slowly with yellow highlights.
- **Projects panel**: draggable node graph; click empty space to add a node.
- **Chat room**: AIM-style window, screen-name sign-on (remembered in localStorage), two scripted bots (DialUpDan, Y2Kpixie; placeholder personas).
  Commands: `/help`, `/spell WORD` (puts a word in the front-page caption), `/party`, `/buzz`, `/away MESSAGE`, `/screensaver`.
- **Screensaver** after 25 s idle: bouncing pixel wordmark with a corner-hit counter.
- **Secret**: ↑↑↓↓←→←→ B A.

## Not done yet

Real chat (Supabase Realtime), OpenRouter bots, the `/admin` blog editor, and the Next.js + Vercel build.
