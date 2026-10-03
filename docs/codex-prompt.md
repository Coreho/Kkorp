# Codex prompt: build KoreoKorp V2

Copy everything below the line into Codex.

---

You are building **KoreoKorp V2**, a personal website, as a production web app in this repository (`Coreho/Kkorp`). The design is finished and lives in a working, clickable mockup. Your job is to turn that mockup into a real Next.js site with a live chat room, AI chat bots and a blog the owner can publish to. Match the mockup's look and motion closely; do not redesign it.

## Read these first

| File | What it is |
|---|---|
| `mockups/koreokorp-v2/index.html` | **Source of truth.** A single self-contained HTML file with all markup, CSS and JS. Open it in a browser and click through every state before you write code. |
| `mockups/koreokorp-v2/README.md` | Feature list of the mockup. |
| `docs/design/meridian-editorial-carousel-DESIGN.md` | Visual system the site follows: dark, black glass cards, 0.8px white hairline borders, Montserrat, uppercase display type, indigo `#4B4BA0` and purple `#8F47AE` accents, 16/32/9999px radii, 4px spacing rhythm, 150–300ms motion. |
| `docs/design/future-workspaces-DESIGN.md` | Earlier layout reference (four panels). Background only. |
| `assets/koreokorp-logo-original.webp` | The KoreoKorp logo as supplied. |
| `assets/koreokorp-logo-cutout.webp` | Logo with the background made transparent (what the mockup draws). |
| `assets/koreokorp-logo-outline.json` | The logo's outer silhouette as a polygon (x in −1..1, same scale for y) plus its aspect ratio. Used as the morph target for the jelly logo. |

## Stack (decided, do not change)

- **Next.js 16, App Router, TypeScript (strict)**, deployed on **Vercel** (free tier).
- **Supabase** (free tier): Postgres, Realtime (Postgres changes + Presence), Auth (magic link, admin only).
- **OpenRouter** free models for the two chat bots, called only from the server.
- Plain CSS (CSS Modules or a single global stylesheet ported from the mockup). No Tailwind unless it makes porting the mockup CSS strictly easier.
- Fonts via `next/font/google`: Montserrat (400/500/600/700) and Archivo Black.
- Package manager: npm.

## Hard rules

1. **Do not create, modify or connect to any real Supabase project.** Write SQL migrations to `supabase/migrations/` and read connection details from env vars only. The owner will choose the project and apply the migrations later.
2. Never put secrets in client code. `OPENROUTER_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only.
3. Ship a `.env.example` with every variable, each with a one-line comment.
4. The site must still run with **no env vars set**: fall back to the mockup's scripted chat and sample posts, so `npm run dev` works on a fresh clone.
5. Keep everything inside free tiers: no paid APIs, no always-on servers, debounce and rate-limit anything that calls OpenRouter or writes to the database.

## What the site does (match the mockup)

### 1. Landing page
- Full-screen dark landing with the KoreoKorp logo large and centred (about 972px wide on desktop, `min(972px, 86vw)`), gently breathing, plus "A small corner of the internet." and a pulsing "Click the logo to enter".
- Clicking the logo (or Enter on the focused landing button) makes it splat and glide up with squash-and-stretch, shrinking to about 162px wide and docking at the top centre as the header logo. The landing fades out and the carousel fades and scales in.
- Clicking the docked logo, or pressing Esc, returns to the landing page.

### 2. Jelly shapes (the signature motion)
- The logo is drawn on a full-screen canvas as a **solid jelly shape**: a closed outline of ~320 springy vertices that morphs between target outlines. While it moves it is a blue silhouette (`#1F6FE5`); once it settles, the logo artwork fades in exactly on top.
- Opening any slide makes a **second jelly shape pop out of the header logo**, fly to the slide and morph into that slide's icon: a thought cloud with two trailing bubbles reading "who or what / is kkorp?" (About), a page with text lines (Blog), an old computer with a mint screen and blinking `C:\>` (Projects), a pink speech bubble with bouncing typing dots on the chat window's corner (The Lobby). Leaving the slide pulls it back into the logo.
- Both shapes stretch along their direction of travel and squash across it, wobble when they land, and use time-based physics (speed must not depend on frame rate).
- Each new chat message sends a small droplet from the header logo to the new message.
- Port this from the `swarm`/`makeBlob` code in the mockup. Keep the maths; restructure it into typed modules.

### 3. Editorial carousel
- Four glass slides: **01 About, 02 Blog, 03 Projects, 04 The Lobby**. The current slide is centred; its neighbours peek in at the left and right edges (~7% of the width on desktop, 18px on phones) with vertical labels, and clicking a peek goes to it.
- Navigation: bottom pill bar (`‹ 01 About · 02 Blog · 03 Projects · 04 Lobby ›`, numbers only on phones), ← / → keys (ignored while typing), and horizontal swipe on touch. Slides move with a 600ms `cubic-bezier(.4, 0, .2, 1)` transform.
- Slide titles are huge uppercase Montserrat (`clamp(44px, 7.6vw, 128px)`).
- A full-bleed dot-matrix field breathes slowly behind everything, with subtle pointer drift.
- Respect `prefers-reduced-motion`: keep the transitions but drop continuous animation to a still frame.

### 4. About slide
- The intro copy, a timeline and a "Find KoreoKorp" list (email with a working Copy button, GitHub, "Enter The Lobby →" which jumps to slide 4). Timeline years and links are **placeholders**: keep them in one content file (`content/about.ts`) so the owner can edit them.
- A rotating caption that cycles every 9s and includes live values: who spoke last in The Lobby and how many people are online.

### 5. Blog slide
- Post list (date, title, excerpt) from the `posts` table, newest first, published only. Fall back to the mockup's three sample posts when Supabase isn't configured.
- Background canvas: the "page that writes itself" (typed bar lines, red margin rule, yellow glowing highlights that fade). When the slide is current it scrolls slowly with glows; it cascades fast while hovered when it isn't current.
- Add a post page at `/blog/[slug]` in the same dark editorial style (huge title, date, Markdown body rendered safely). This page isn't in the mockup: keep it simple and on-system.

### 6. Projects slide
- Project cards (glass, 16px radius) from `content/projects.ts`.
- Background canvas: the draggable node graph (labelled nodes Next.js, Supabase, Vercel, Chat, Bots, Blog, Admin; springs; moving packets; click empty space to add a node, max 30).

### 7. The Lobby (chat room) — the main new functionality
- The AIM-style window from the mockup, pixel-faithful: navy title bar, menu row, white message log, "In this room" buddy list with BOT chips, `:-)` button, Send button, status bar with "X is typing…".
- **Screen names, no login.** 3–16 characters, letters, numbers and underscores. Case-insensitive uniqueness among people currently present. Remember the name in `localStorage`.
- **Realtime:** messages go to the `messages` table and arrive for everyone through Supabase Realtime. Load the last 50 on open.
- **Presence:** Supabase Presence drives the buddy list, the online count, "has entered/left the room" lines and away status. Bots always appear in the list.
- **Typing indicator** through a Realtime broadcast channel (throttled).
- **Slash commands** (handled client-side, some broadcast to everyone): `/help`, `/spell WORD` (puts a word in the About caption for everyone for 20s), `/party` (rainbow + bounce on the jelly shapes for everyone), `/buzz` (shakes the sender's window and broadcasts a buzz line), `/away MESSAGE` (sets presence to away until the next message), `/screensaver`.
- **Moderation basics:** max 300 characters, strip control characters, render text only (never HTML), server-side rate limit of about 1 message per second per screen name and IP hash, and a small blocklist. Messages older than 30 days can be pruned by a scheduled SQL function.

### 8. Bots
- Two resident bots. The mockup's **DialUpDan** (grumpy 90s sysadmin) and **Y2Kpixie** (hyper Y2K optimist) are **placeholder personas**: put names, system prompts, style notes and canned fallback lines in `content/bots.ts` so they can be swapped without code changes.
- A server route (`app/api/bots/route.ts`, Node runtime) decides whether a bot replies to a new human message. Reply probability of about 60%, choose the bot that fits, include the last ~15 messages as context, keep replies to one or two short lines in character, and insert the reply as a bot message.
- **Idle banter:** when people are present and the room has been quiet for a while, the bots occasionally talk to each other. Trigger this from the client on a jittered timer, but let the server enforce a global cooldown (at most one bot message every 8s, plus an hourly cap) so it cannot burn through free-tier limits.
- Use an OpenRouter free model set by `OPENROUTER_MODEL`, with a 10s timeout. On any failure or a missing key, fall back to the canned lines.

### 9. Admin
- `/admin`, protected by Supabase Auth magic link and restricted to `ADMIN_EMAIL`. Everyone else gets a 404.
- Post list (drafts and published), a Markdown editor with live preview, title, slug (auto-generated, editable), excerpt, publish/unpublish and delete. Writes go through server actions using the user's session plus RLS (no service role in the browser).
- Style it with the same dark glass system, simply.

### 10. Screensaver and secret
- After 25s with no input, the screensaver: the wordmark as pixel particles bouncing around a black screen, changing colour on every wall hit, bursting with "CORNER!" and a counter on exact corner hits. Any input wakes it, and the waking click must not trigger anything underneath.
- Konami code (↑↑↓↓←→←→ B A, ignored while typing): the rainbow party effect plus a "Secret unlocked" caption.

## Data model (write as migrations, do not apply)

- `messages`: `id uuid pk`, `screen_name text not null`, `body text not null check (char_length(body) between 1 and 300)`, `is_bot boolean default false`, `kind text default 'chat'` (`chat`, `system`, `buzz`), `created_at timestamptz default now()`. Index on `created_at desc`.
- `posts`: `id uuid pk`, `slug text unique`, `title`, `excerpt`, `body_md`, `published boolean default false`, `published_at`, `created_at`, `updated_at`.
- `bot_state`: a single row holding `last_bot_at` and `hour_count` for the global cooldown.
- **RLS:**
  - `messages`: anyone can select. Inserts are allowed only for non-bot rows that pass the length check; bot rows are inserted by the server with the service role.
  - `posts`: anyone can select published rows; only the admin (matched by `auth.jwt() ->> 'email'`) can do anything else.
  - `bot_state`: service role only.
- Enable Realtime on `messages`.

## Env vars (`.env.example`)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `ADMIN_EMAIL`, `NEXT_PUBLIC_SITE_URL`.

## Suggested structure

```
app/
  layout.tsx            fonts, metadata, global CSS
  page.tsx              landing + carousel (server component that loads posts, renders <Site/>)
  blog/[slug]/page.tsx
  admin/...             login, post list, editor
  api/bots/route.ts
components/             Landing, Carousel, Slide*, AimWindow, BuddyList, Composer, NavBar, Screensaver
lib/
  canvas/               jellyShapes.ts, dotField.ts, blogScene.ts, nodeGraph.ts, screensaver.ts
  chat/                 useLobby.ts (realtime + presence + commands), commands.ts, validate.ts
  supabase/             client.ts, server.ts, admin.ts
content/                about.ts, projects.ts, bots.ts, samplePosts.ts
supabase/migrations/
```

Each canvas engine must be a class or function that takes its canvas and container, returns `dispose()`, and cleans up every `requestAnimationFrame`, listener, timer and observer. React 19 StrictMode mounts effects twice in development, so a leak shows up immediately. Pause drawing when a canvas is off-screen or the tab is hidden.

## Quality bar

- `npm run lint`, `npm run typecheck` (add the script) and `npm run build` all pass.
- Add Playwright smoke tests:
  - landing → enter → each slide → Esc back to landing
  - chat sign-on and send with the scripted fallback
  - `/admin` returns 404 when signed out
- Works at 390px phone width (no horizontal scroll), keyboard-navigable, visible focus rings, `aria-current` on the active nav pill, decorative canvases `aria-hidden`.
- Lighthouse performance ≥ 85 on desktop; the canvases must not block the main thread for long frames.

## How to deliver

Work on a feature branch in small, reviewable commits:

1. Scaffold.
2. Static port with the mockup data.
3. Canvas engines.
4. Supabase schema and chat.
5. Bots.
6. Admin and blog post page.
7. Tests.

Open a pull request with a summary, screenshots of each slide at desktop and phone width, and a checklist of anything that differs from the mockup.

## Still open (don't decide these; leave clear TODOs)

- Final bot names and personalities.
- Which Supabase project to use and the production domain.
- Real About copy, timeline, links and project list.
