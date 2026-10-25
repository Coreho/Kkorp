# Content control · admin extension

Mode: Operate. Target: `/` on `adctrl.koreokorp.com`, `/admin` during local development.

The owner needs to change page copy, add project descriptions and images, and write blog entries without editing source. The existing website is the visual authority: black surfaces, white text, the KoreoKorp logo, indigo primary controls, cyan focus and status feedback. This extension preserves the public carousel and animations.

The editor uses a fixed content navigation rail, an entry list for collections, and a readable form. Page text is grouped by its public section. The dominant action saves or publishes; drafts and deletion have separate explicit controls. Status messages describe whether content is live or private. Empty, uploading, saving, login failure, session expiry, and version-conflict states are implemented.

At 760px and below, navigation becomes a compact top bar and the entry list stacks above the form. Controls retain a 44px minimum target, including View website and Preview text. Keyboard focus uses a 2px cyan outline with a 4px offset. Labels stay visible at 14px, body and form text use 15px, workspace headings scale from 28–40px, and form section headings use 20px. The login heading uses 44px on desktop and 36px on small screens. Inputs use a quiet dark surface and an 8px radius. Feedback is announced by a live status region.

The scoped editor uses flat surfaces and thin white rules rather than the public carousel's glass effects: black canvas, dark card (`#0c0c12`), field (`#14141d`), selected row (`#25253e`), indigo primary (`#4b4ba0`, hover `#6060b9`), cyan feedback (`#67e8f9`), and pale red errors (`#ffb4b4`). The desktop rail is 240px wide, the collection list is 240px wide, and the form stops at 800px; rail and list reduce to 200px below 1100px. Buttons and fields share 8px corners. Entry rows use flat dividers, selection is exposed with `aria-current`, and action arrows are inline SVG. These are admin-specific applications, not new rules for the public site.

The implementation inherits the palette and type stack from `index.html`. Admin uses the local font fallback to avoid loading third-party resources on the login screen. The existing public design notes contain a conflicting white background token; the current black implementation remains authoritative. No public design-system replacement is intended.

Quality contract: editing must make save/publish effects clear, preserve unsaved form data on session expiry, reject unsafe content on the server, and work at 390px without horizontal scrolling. Screenshots and browser tests verify desktop and phone layouts. HTTPS and DNS activation require an actual deployment.
