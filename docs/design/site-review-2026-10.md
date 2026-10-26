# Site review, October 2026

TASK-006. A structured review of the live site at desktop and phone widths. It
separates small fixes from larger experiments, and it keeps the site's character:
the carousel, the jelly, the scenes and the retro Lobby.

Captured on 2026-10-25 from https://koreokorp.com (release `d38560941f42`) with
`node scripts/site-audit-capture.mjs`. Screenshots and the raw numbers are in
[`docs/evidence/site-audit/`](../evidence/site-audit/); `measurements.json` holds
every value quoted here. Run the script again after changes to compare.

## What was covered

| Area | States captured |
| --- | --- |
| Landing | Before entering, 1280 × 800 and 390 × 844 |
| Panels | About, Blog, Projects and Lobby open, live content, both widths |
| Content states | Blog and Projects with the live content (0 entries, 1 project), populated (4 entries, 6 projects, long titles), and empty. Populated and empty content is substituted in the browser only |
| Blog entry pages | A normal entry and a very long title, both widths |
| Navigation | Every Tab stop after entering with the keyboard, focus ring, on-screen check |
| Motion | `prefers-reduced-motion: reduce`, both widths; the screensaver |
| Accessibility | Contrast on rendered pixels, control sizes, 200% zoom (640 × 400 CSS pixels) |

Contrast is measured two ways (see the script). "Rendered" compares the darkest
and lightest pixels in a text box. It reads small or thin text low, because
antialiasing never reaches full ink. "Computed" compares the element's colour
with the median pixel behind it.

## What already works

Keep these as they are:

- **No sideways scrolling.** No horizontal overflow at 1280px, at 390px, or at
  200% zoom, in any of the 25 captured states.
- **Keyboard.** Entering with the keyboard and pressing Tab reaches the home
  link, the previous arrow, all four sections, the next arrow, then the open
  panel's controls (on About: Copy, Enter The Lobby). Every stop shows a focus
  ring and is on screen. Arrow keys and phone swipes also move between
  sections. See [desktop-keyboard-focus](../evidence/site-audit/desktop-keyboard-focus.jpg).
- **Text contrast.** All measured body text is between 7.3:1 and 18.8:1
  (computed), and the active section in the navigation is 5.6:1. Inactive
  section numbers on the phone are 55% opacity. They are estimated at about
  5:1, which passes AA but is the dimmest text on the page.
- **Blog entry pages.** The reading column is 672px wide on desktop and 358px on
  the phone. Long titles wrap cleanly, and the back links are clear
  ([desktop](../evidence/site-audit/desktop-entry-a-very-long-title.jpg),
  [phone](../evidence/site-audit/phone-entry-a-very-long-title.jpg)).
- **Empty projects.** "New projects are on the way." reads as intentional
  ([phone](../evidence/site-audit/phone-empty-projects.jpg)).
- **Reduced motion.** It changes motion, not layout, and the TASK-015 tests
  (`tests/app/animations.spec.js`, `tests/app/tactile.spec.js`) already check
  the switch. The jelly keeps animating by the owner's decision of 2026-10-06.
- **Zoom.** At 200% the navigation stays on screen (it sits at 330–380px of a
  400px viewport) and the open panel scrolls.
- **No console errors** at either width.

## Findings, ranked

Impact describes who is affected and how often. Effort is a rough size: XS is
under an hour, S is a focused change to one component, M touches layout across
panels. "Quick" means a small change that keeps the design; "experiment" means
the right answer needs trying.

| # | Finding | Impact | Effort | Kind | Where it fits |
| --- | --- | --- | --- | --- | --- |
| R1 | The live site still calls itself a mockup | High | XS | Quick | New task, or TASK-005 |
| R2 | The editor offers copy that visitors never see | High | S | Quick | TASK-010 |
| R3 | The empty Blog looks like it is still loading | High | S | Quick | TASK-014 |
| R4 | On the phone, the Projects scene draws over the cards | High | S | Quick | TASK-013 |
| R5 | Projects without an image all look the same | Medium | S | Quick | TASK-013 |
| R6 | Nothing says a panel has more below | Medium | S | Quick | TASK-014 |
| R7 | Phone navigation is numbers only, for sighted and screen reader users | Medium–high | S | Quick | TASK-014 |
| R8 | Short content leaves desktop panels mostly empty | Medium | M | Experiment | TASK-013, TASK-014 |
| R9 | The screensaver interrupts reading after 25 seconds | Medium | XS | Quick | New task |
| R10 | On the phone, the jelly's bubble covers content | Low–medium | S | Quick | TASK-014 |
| R11 | Some controls are small on the phone | Low–medium | S | Quick | TASK-014 |

### R1. The live site still calls itself a mockup

**Evidence:**

- A yellow "MOCKUP · SAMPLE CONTENT" badge sits in the top-left of every
  screen. On the phone it wraps to three lines next to the logo
  ([phone-landing](../evidence/site-audit/phone-landing.jpg)).
- About shows "PLACEHOLDER" tags beside the timeline and the contact details,
  although both now hold the owner's real entries (1990 Birth,
  cork@koreokorp.com, github.com/coreho)
  ([desktop-live-about](../evidence/site-audit/desktop-live-about.jpg)).
- The browser tab reads "KoreoKorp V2 Mockup". That is the Browser title field
  in the editor's Page text, still at its default.

**Recommendation:**

- Remove the sample badge (`components/Site.tsx`, `.sample-tag`).
- Show the placeholder tags (`.ph` in `components/Panels.tsx`) only while a
  section still holds the bundled default values from `content-model.js`.
- The owner can change the browser title in the editor today, with no code
  change.

**Done when:**

- With the live content, neither the badge nor a placeholder tag appears.
- With the defaults, the tags still appear.
- A test covers both cases.

### R2. The editor offers copy that visitors never see

**Evidence:**

- `.panel.open .rest { display: none }` hides each section's introduction and
  the Blog's "Latest post" card whenever a panel is open.
- `.panel .action { display: none }` hides the four section buttons everywhere.
- Panels that are not open sit off screen or show only their tab. In every
  panel visit at both widths, sampled through the slide animation, none of
  these elements was ever on screen.
- The editor still offers "Short introduction", "Blog introduction",
  "Projects introduction", "Lobby introduction" and four button labels. So the
  owner's "Random thoughts and opinions." (the live Blog introduction) changes
  nothing a visitor sees.

**Recommendation:**

- Show each section's introduction as one line under its heading in the open
  panel, using the existing `.blurb` style. Blog and Projects currently open
  straight into their lists with no context.
- Remove the four button-label fields from the editor, because the carousel
  navigates with the section bar and by clicking a panel.
- Decide the "Latest post" card with R3. It only adds something when the list
  itself is not visible.

**Effect on TASK-010:** AC#1 asks for an editable call-to-action label and
destination. Under this recommendation there are no call-to-action buttons, so
AC#1 should cover the introduction and supporting copy only.

**Done when:**

- Changing an introduction in the editor changes the open panel at both widths.
- No editor field is invisible on the public site.

### R3. The empty Blog looks like it is still loading

**Evidence:**

- The live Blog has no entries.
- The Blog scene draws rows of grey text-line bars with yellow highlights, and
  the empty note "The journal is waiting for its first entry." sits on top of
  about twenty of them.
- On the phone the bars fill the panel below the note
  ([phone-live-blog](../evidence/site-audit/phone-live-blog.jpg),
  [desktop-live-blog](../evidence/site-audit/desktop-live-blog.jpg)).
- To a visitor this reads as a skeleton loader that never finishes.

**Recommendation:**

- In the empty state, give the note a proper block: a heading plus one
  sentence, styled like the "latest" card.
- Fade the scene's line bars well back, or draw only the document icon, while
  there are no entries.
- With entries, the list covers the bars, so the populated state can stay as
  it is ([desktop-populated-blog](../evidence/site-audit/desktop-populated-blog.jpg)).

**Done when:** an empty Blog shows one clear message, with no loading-like
pattern behind it, at both widths.

### R4. On the phone, the Projects scene draws over the cards

**Evidence:**

- At 390px with six projects, the monitor illustration and the node-graph
  labels (Vercel, Next.js, Bots) are painted on top of the second card
  ([phone-populated-projects](../evidence/site-audit/phone-populated-projects.jpg)).
- On desktop, the scene sits beside the cards and does not collide
  ([desktop-populated-projects](../evidence/site-audit/desktop-populated-projects.jpg)).
- The live site has one project, so this is not visible yet. It will be once a
  second project is published.

**Recommendation:**

- Put the scene behind the card list on the phone (stacking order).
- Alternatively, draw the scene only in the empty state there.

**Done when:** at 390px, with two or more projects, no scene element is drawn
over a card, and a test checks it.

### R5. Projects without an image all look the same

**Evidence:**

- The owner chose logo-only fronts and description-only backs
  ([project-cards.md](project-cards.md)). That works for a project with its
  own logo.
- A project without an uploaded image falls back to the KoreoKorp logo. Two or
  more such projects show identical tiles, with nothing to tell them apart until
  hover or focus.

**Recommendation:**

- Keep logo-only fronts for projects that have an image.
- For a project without one, show its title on the front instead of the site
  logo, in the same face and material.
- This belongs with TASK-013's text-only fallback (its AC#1).

**Done when:** at both widths, projects without images are distinguishable at
a glance, long titles wrap without overflow, and the owner confirms that the
fallback keeps the look they asked for.

### R6. Nothing says a panel has more below

**Evidence:**

- Measured hidden content, with the only cue being an item cut by the panel
  edge:

  | Panel | Hidden below |
  | --- | --- |
  | Projects on the phone, six projects | 822px |
  | Blog on the phone, four entries | 113px |
  | Projects on desktop, six projects | 236px |
  | About at 200% zoom | 209px |

- On desktop, the Blog's closing note is clipped 9px by the panel edge.

**Recommendation:**

- While the panel's scroller has more content below, add a soft fade at its
  bottom edge (`.inner`: scrollTop + clientHeight < scrollHeight).
- Add enough bottom padding that the last item never sits flush against the
  edge.

**Done when:** a panel with hidden content shows the fade, and the fade
disappears at the end. This is TASK-014 AC#1.

### R7. Phone navigation is numbers only, for sighted and screen reader users

**Evidence:**

- Below 900px the section bar shows "01 02 03 04". The names are hidden, and
  inactive numbers are dimmed to 55%
  ([phone-live-about](../evidence/site-audit/phone-live-about.jpg)).
- A first-time visitor has to try each number to find the Lobby or the Blog.
- The names are hidden with `display: none` (`.cnav button b`), which also
  removes them from the accessibility tree. At 390px, the browser's
  accessibility snapshot of the section bar reads: button "01", button "02",
  button "03", button "04". So screen reader users hear only numbers too.

**Recommendation:**

- Show the active section's name in the pill ("02 Blog") and keep the others
  as numbers. The 390px bar has room for one name.
- Hide the other names visually only (a visually-hidden class rather than
  `display: none`), so every button keeps its full name.
- Raise inactive numbers to about 70% opacity.

**Done when:** at 390px the active section is named on screen, nothing
overflows, and every section button's accessible name includes its section
name, checked by a test. This is TASK-014 AC#1.

### R8. Short content leaves desktop panels mostly empty (experiment)

**Evidence:**

- With the one live project, the Projects panel uses its top-left quarter, and
  the node graph and monitor fill the rest
  ([desktop-live-projects](../evidence/site-audit/desktop-live-projects.jpg)).
- An empty Blog is a single line (R3).

**Recommendation:** try larger tiles that span the panel when there are three
or fewer projects, with the scene placed in the space that is left. This is a
design experiment: compare two or three layouts on staging before choosing.
TASK-014 AC#2 and TASK-013.

### R9. The screensaver interrupts reading after 25 seconds

**Evidence:**

- `lib/canvas/engines/screensaver.ts` starts after 25 seconds without input
  (`IDLE_MS = 25_000`). It covers the page until the pointer moves or a key is
  pressed.
- Reading the About text or the Blog list without touching anything is enough
  to trigger it. It interrupted this capture run and blocked a click.
- On a phone, reading without touching is normal.

**Recommendation:**

- Start the screensaver only from the landing, or after about two minutes.
- Keep it as the site's easter egg.

**Done when:** an open panel stays on screen for at least two minutes without
input, and the screensaver checks in `tests/app/engines.spec.js` still pass
with the new timing.

### R10. On the phone, the jelly's bubble covers content

**Evidence:**

- At 390px, About's thought bubble covers the section number "01" beside the
  heading ([phone-live-about](../evidence/site-audit/phone-live-about.jpg)).
- In the Lobby, the chat bubble overlaps the sample badge and the top of the
  chat window ([phone-live-chat](../evidence/site-audit/phone-live-chat.jpg)).

**Recommendation:** on narrow screens, keep a minimum gap between the bubble
and the heading, or shrink the bubble there. The jelly engine places it from
the panel's box (see the note in `docs/tactility.md`), so the gap belongs in
that placement code.

**Done when:** at 390px the bubble never overlaps text or controls on any panel.

### R11. Some controls are small on the phone

**Evidence:**

- The section bar items and arrows are 36px tall. That passes WCAG 2.2 AA (a
  24px minimum) but is under the 44px touch guideline the editor already meets.
- The Lobby window's minimise and close buttons are 18 × 16px, the smiley
  button is 27 × 22px, and the sign-on field and button are 26px tall.

**Recommendation:**

- Give these controls 44px hit areas on touch screens (`pointer: coarse`), with
  padding or an invisible pseudo-element, so the retro window keeps its look.
- Or hide the minimise button on the phone, where it has no use.

**Done when:** every control at 390px has a hit area of at least 44 × 44px,
and the Lobby looks unchanged.

## Coverage of TASK-006's questions

| Question | Covered by |
| --- | --- |
| Content hierarchy | R2 (intros hidden), R3, R5 |
| Desktop dead space | R8, R3 |
| Mobile scroll and section cues | R6, R7 |
| Placeholder treatment | R1, R3 |
| Focus and contrast | "What already works", R7 (accessible names), R11 |
| Reduced-motion behaviour | "What already works", R9 |

## Larger experiments outside this review

- **Server-rendered entry pages.** Missing entries would return a real 404
  status, and search engines would get full content. This is already noted on
  TASK-003 and TASK-017.
- **Alternate themes.** TASK-007 and TASK-008 are unchanged by this review. R1
  and R3 should land first, so that palette mockups show real content, not
  sample badges.

## What the owner decides

The reviewer cannot make these calls:

1. Which findings to turn into tasks. The suggested order is R1, R2, R3, R4,
   then R5–R7.
2. R2: whether to show the introductions in open panels (recommended) or remove
   those fields from the editor.
3. R9: whether the screensaver should start only from the landing or after a
   longer idle time.
4. R8: whether to spend a staging experiment on desktop layouts for short
   content.
