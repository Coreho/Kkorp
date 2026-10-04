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

function readVariable(name: string, fallback: string): string {
  if (typeof document === 'undefined') {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

/** The family name next/font actually installed, for use in ctx.font. */
export function sansFamily(): string {
  return readVariable('--font-montserrat', 'Montserrat');
}

export function displayFamily(): string {
  return readVariable('--font-archivo', 'Archivo Black');
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
    const sans = sansFamily();
    const display = displayFamily();
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