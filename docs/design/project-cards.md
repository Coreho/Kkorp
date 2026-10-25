# Project flip cards

The owner requested logo-only fronts and description-only backs. The production React `ProjectCard` in `components/Panels.tsx` implements that composition.

- Front: one contained image from the project's uploaded image, centered without a visible title, description, or instruction. Projects without an uploaded image use the existing KoreoKorp logo.
- Back: the project's description. The whole tile links to the project in a new tab when a URL is configured.
- Accessible name: project title and description remain available to assistive technology.
- Interaction: hover and keyboard-focus flips are preserved; clicking or tapping opens the project. Mouse hover adds a brighter accent glow, a 4px lift, and 4.5% enlargement. Reduced-motion preferences disable movement and reveal the back instantly.

The existing card materials, borders, layout, and public carousel are preserved. Logo images keep their natural proportions. Verified against the owner's published project at desktop and 390px phone widths, including touch, keyboard, reduced motion, and the existing 620 KiB JavaScript ceiling.

Tiles are capped at 280px wide and 220px tall, shrink to fit narrow screens, and do not stretch to fill the section. Long descriptions scroll within the back face. Phones use a flat face swap rather than nested 3D transforms; project links activate on the first tap.
