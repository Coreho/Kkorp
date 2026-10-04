/**
 * Canvas font helpers.
 *
 * The prototype sets `ctx.font` to the literal strings 'Montserrat' and
 * 'Archivo Black' and then calls measureText. next/font renames the families,
 * and canvas has no fallback for a font that has not loaded yet, so text
 * measured before the webfont arrives is sized against the wrong face. These
 * helpers resolve the real family name from the CSS variables and wait for the
 * fonts to be ready before the first draw.
 */

function readVariable(name: string): string {
  if (typeof document === 'undefined') {
    return '';
  }
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

/**
 * A font stack usable in `ctx.font`.
 *
 * next/font resolves its CSS variable to an already-quoted family list, e.g.
 * `"Archivo Black", "Archivo Black Fallback"`. Wrapping that in quotes again
 * produces `""Archivo Black", "Archivo Black Fallback""`, which is not a
 * valid font shorthand — and canvas rejects an invalid assignment *silently*,
 * leaving the previous font in place. That failure is invisible until text is
 * measured against the wrong face at the wrong size.
 */
export function fontStack(variable: string, fallback: string): string {
  const raw = readVariable(variable);
  if (!raw) {
    return `"${fallback}", sans-serif`;
  }
  return raw.includes('"') ? raw : `"${raw}", sans-serif`;
}

export function sansStack(): string {
  return fontStack('--font-montserrat', 'Montserrat');
}

export function displayStack(): string {
  return fontStack('--font-archivo', 'Archivo Black');
}

/**
 * Assign `ctx.font` and report whether the canvas accepted it.
 *
 * A rejected assignment leaves the previous font untouched, so the only way to
 * notice is to compare before and after.
 */
export function applyFont(
  ctx: CanvasRenderingContext2D,
  weight: string,
  sizePx: number,
  stack: string,
): boolean {
  ctx.font = `${weight} ${sizePx}px ${stack}`;
  // The canvas normalises the shorthand it stored; a valid assignment keeps our
  // size, an invalid one falls back to the default "10px sans-serif".
  const stored = ctx.font;
  const size = Number.parseFloat(stored);
  return Number.isFinite(size) && Math.abs(size - sizePx) < 0.01;
}

let ready: Promise<void> | null = null;

/**
 * Resolve once the faces the canvas engines measure against are loaded.
 * Cached, because it is awaited by several independent engines.
 */
export function fontsReady(): Promise<void> {
  if (ready) {
    return ready;
  }
  ready = (async () => {
    if (typeof document === 'undefined') {
      return;
    }
    const sans = sansStack();
    const display = displayStack();
    const wanted: Promise<unknown>[] = [];
    for (const spec of [
      `400 16px "${sans}"`,
      `500 16px "${sans}"`,
      `700 16px "${sans}"`,
      `400 16px "${display}"`,
      `900 16px "${display}"`,
    ]) {
      // FontFaceSet.load rejects on an unavailable face; a failed load must not
      // stop the engine from drawing, so swallow it and let the fallback apply.
      wanted.push(document.fonts.load(spec).catch(() => undefined));
    }
    await Promise.all(wanted);
    await document.fonts.ready.catch(() => undefined);
  })();
  return ready;
}