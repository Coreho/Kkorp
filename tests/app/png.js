/**
 * A minimal PNG reader, so contrast can be measured on real rendered pixels.
 *
 * Why this exists: the first version of the AC#6 check simulated the grain's
 * `mix-blend-mode: overlay` in a canvas and compared the result to the original
 * ratio. It passed, and the Lobby's chat log was still visibly washed out on
 * staging. Overlay lightens, so over a near-white chat face it pushes light grey
 * text even lighter, and no simulation of the blend maths predicted that. The
 * only trustworthy measurement is of the pixels the browser actually produced.
 *
 * Node's zlib is built in, so this adds no dependency. It handles the only
 * shape Playwright produces: 8-bit, non-interlaced, RGB or RGBA.
 */

import { inflateSync } from 'node:zlib';

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

/** Bytes per pixel, by PNG colour type. */
const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/**
 * Decode a PNG buffer to raw RGBA samples.
 *
 * Returns `{ width, height, data }` with four bytes per pixel.
 */
export function decodePng(buffer) {
  for (let i = 0; i < SIGNATURE.length; i++) {
    if (buffer[i] !== SIGNATURE[i]) {
      throw new Error('not a PNG');
    }
  }

  let offset = 8;
  let header = null;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const body = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      header = {
        width: body.readUInt32BE(0),
        height: body.readUInt32BE(4),
        depth: body[8],
        colorType: body[9],
        interlace: body[12],
      };
    } else if (type === 'IDAT') {
      idat.push(body);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  if (!header) throw new Error('PNG has no IHDR');
  if (header.depth !== 8) throw new Error(`unsupported bit depth ${header.depth}`);
  if (header.interlace !== 0) throw new Error('interlaced PNG not supported');
  const channels = CHANNELS[header.colorType];
  if (!channels) throw new Error(`unsupported colour type ${header.colorType}`);

  const raw = inflateSync(Buffer.concat(idat));
  const { width, height } = header;
  const stride = width * channels;
  const out = Buffer.alloc(stride * height);

  // Undo the per-scanline filters, in place, one row at a time.
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const target = out.subarray(y * stride, (y + 1) * stride);
    const prior = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const rawByte = line[x];
      const a = x >= channels ? target[x - channels] : 0;
      const b = prior ? prior[x] : 0;
      const c = prior && x >= channels ? prior[x - channels] : 0;
      let value;
      switch (filter) {
        case 0:
          value = rawByte;
          break;
        case 1:
          value = rawByte + a;
          break;
        case 2:
          value = rawByte + b;
          break;
        case 3:
          value = rawByte + ((a + b) >> 1);
          break;
        case 4:
          value = rawByte + paeth(a, b, c);
          break;
        default:
          throw new Error(`unknown PNG filter ${filter}`);
      }
      target[x] = value & 0xff;
    }
  }

  // Normalise whatever channel layout we got to RGBA.
  if (channels === 4) {
    return { width, height, data: out };
  }
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0, j = 0; i < width * height; i++) {
    rgba[j++] = out[i * channels];
    rgba[j++] = out[i * channels + (channels > 2 ? 1 : 0)];
    rgba[j++] = out[i * channels + (channels > 2 ? 2 : 0)];
    rgba[j++] = channels === 2 ? out[i * channels + 1] : 255;
  }
  return { width, height, data: rgba };
}

const linear = (value) => {
  const s = value / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

export function relativeLuminance({ r, g, b }) {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

export function contrastRatio(a, b) {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The worst-case contrast of text over its background inside a region.
 *
 * Text pixels are the minority in any text region, so the 2nd and 98th
 * percentile of luminance stand in for the ink and the page. Comparing those
 * rather than the extremes keeps a single stray pixel, or the grain's own noise,
 * from deciding the answer.
 */
export function regionContrast(png, box) {
  const { width, data } = png;
  const x0 = Math.max(0, Math.floor(box.x));
  const y0 = Math.max(0, Math.floor(box.y));
  const x1 = Math.min(width, Math.ceil(box.x + box.width));
  const y1 = Math.min(png.height, Math.ceil(box.y + box.height));

  const lums = [];
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 8) continue;
      lums.push(relativeLuminance({ r: data[i], g: data[i + 1], b: data[i + 2] }));
    }
  }
  if (lums.length < 20) {
    throw new Error(`region has too few opaque pixels (${lums.length}) to measure`);
  }
  lums.sort((a, b) => a - b);
  const at = (q) =>
    lums[Math.min(lums.length - 1, Math.max(0, Math.round(q * (lums.length - 1))))];

  const dark = at(0.02);
  const light = at(0.98);
  return {
    // Both operands are already relative luminance, so this is the WCAG ratio
    // directly rather than through the gamma curve a second time.
    ratio: (light + 0.05) / (dark + 0.05),
    darkest: dark,
    lightest: light,
    pixels: lums.length,
  };
}
