/**
 * A small Markdown reader for blog entries.
 *
 * The client JavaScript budget (tests/app/tactile.spec.js) has no room for a
 * full Markdown library, and entries only need the everyday subset: paragraphs,
 * headings, emphasis, links, lists, quotes, code and rules. The output is a tree
 * that components/Markdown.tsx renders as React elements, so raw HTML in an
 * entry is shown as text and can never run. Links keep only http(s), mailto,
 * and same-site addresses.
 *
 * Single line breaks inside a paragraph stay line breaks, because entries
 * written before Markdown was supported were plain text that relied on them.
 */

export type Inline =
  | { type: 'text'; value: string }
  | { type: 'code'; value: string }
  | { type: 'strong' | 'em'; children: Inline[] }
  | { type: 'link'; href: string; children: Inline[] }
  | { type: 'break' };

export type Block =
  | { type: 'heading'; level: 2 | 3 | 4; children: Inline[] }
  | { type: 'paragraph'; children: Inline[] }
  | { type: 'code'; value: string }
  | { type: 'quote'; children: Block[] }
  | { type: 'list'; ordered: boolean; start: number; items: Inline[][] }
  | { type: 'rule' };

/** The address a link may point to, or null when it could be unsafe. */
export function safeHref(raw: string): string | null {
  const href = raw.trim();
  // Control characters and spaces can disguise a scheme from the checks below.
  if (!href || /[\u0000- \u007f]/.test(href)) return null;
  if (/^(https?:\/\/|mailto:)/i.test(href)) return href;
  if (href.startsWith('#')) return href;
  // Same-site paths only: browsers read "//" and "/\" as another host.
  if (href.startsWith('/') && !/^\/[/\\]/.test(href)) return href;
  return null;
}

const ESCAPABLE = /[\\`*_[\]()#+\-.!>~|{}<]/;
const BULLET = /^ {0,3}([-*+])\s+(.*)$/;
const ORDERED = /^ {0,3}(\d{1,9})[.)]\s+(.*)$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const HEADING = /^ {0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/;
const RULE = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;
const QUOTE = /^ {0,3}>/;

function startsBlock(line: string): boolean {
  return FENCE.test(line) || HEADING.test(line) || RULE.test(line) || QUOTE.test(line) || BULLET.test(line) || ORDERED.test(line);
}

/** Index of the closing marker, skipping escapes and longer runs of the marker character. */
function findClose(source: string, from: number, marker: string): number {
  for (let i = from; i <= source.length - marker.length; i += 1) {
    if (source.charAt(i) === '\\') {
      i += 1;
      continue;
    }
    if (source.startsWith(marker, i)) {
      const before = source.charAt(i - 1);
      const after = source.charAt(i + marker.length);
      const ch = marker.charAt(0);
      if (before === ch || after === ch) {
        // Part of a longer run, such as ** while looking for *.
        while (source.charAt(i + 1) === ch) i += 1;
        continue;
      }
      if (ch === '_' && after && /[A-Za-z0-9]/.test(after)) continue;
      return i;
    }
  }
  return -1;
}

/** Reads [text](address) starting at an opening bracket. */
function readLink(source: string, open: number, lastClose: number): { text: string; href: string; end: number } | null {
  // Bounded, so text full of unmatched brackets cannot make reading quadratic.
  if (lastClose < open) return null;
  const limit = Math.min(source.length, open + 2000);
  let depth = 0;
  let close = -1;
  for (let i = open; i < limit; i += 1) {
    if (source.charAt(i) === '\\') {
      i += 1;
    } else if (source.charAt(i) === '[') {
      depth += 1;
    } else if (source.charAt(i) === ']') {
      depth -= 1;
      if (depth === 0) {
        close = i;
        break;
      }
    }
  }
  if (close < 0 || source.charAt(close + 1) !== '(') return null;
  let parens = 0;
  for (let i = close + 2; i < Math.min(source.length, close + 2002); i += 1) {
    if (source.charAt(i) === '\n') return null;
    if (source.charAt(i) === '(') parens += 1;
    if (source.charAt(i) === ')') {
      if (parens === 0) {
        // An optional "title" after the address is accepted and ignored.
        const target = source.slice(close + 2, i).trim().replace(/\s+"[^"]*"$/, '');
        return { text: source.slice(open + 1, close), href: target.replace(/^<(.*)>$/, '$1'), end: i + 1 };
      }
      parens -= 1;
    }
  }
  return null;
}

export function parseInline(source: string): Inline[] {
  const out: Inline[] = [];
  let text = '';
  const flush = () => {
    if (text) out.push({ type: 'text', value: text });
    text = '';
  };
  // Markers with no closer left, so a long run of unmatched ones stays linear.
  const unclosed = new Set<string>();
  const lastClose = source.lastIndexOf(']');
  let i = 0;
  while (i < source.length) {
    const ch = source.charAt(i);
    if (ch === '\\' && i + 1 < source.length && ESCAPABLE.test(source.charAt(i + 1))) {
      text += source.charAt(i + 1);
      i += 2;
    } else if (ch === '\n') {
      flush();
      out.push({ type: 'break' });
      i += 1;
    } else if (ch === '`') {
      const run = /^`+/.exec(source.slice(i))![0];
      const end = source.indexOf(run, i + run.length);
      if (end < 0) {
        text += run;
        i += run.length;
        continue;
      }
      flush();
      out.push({ type: 'code', value: source.slice(i + run.length, end).replace(/\n/g, ' ') });
      i = end + run.length;
    } else if (ch === '[' || (ch === '!' && source.charAt(i + 1) === '[')) {
      // Images become links to the image: entries carry a separate cover image.
      const start = ch === '!' ? i + 1 : i;
      const link = readLink(source, start, lastClose);
      if (!link) {
        text += source.slice(i, start + 1);
        i = start + 1;
        continue;
      }
      flush();
      const href = safeHref(link.href);
      const children = parseInline(link.text);
      if (href) out.push({ type: 'link', href, children });
      else out.push(...children);
      i = link.end;
    } else if (ch === '*' || ch === '_') {
      const marker = source.charAt(i + 1) === ch ? ch + ch : ch;
      const inner = i + marker.length;
      const intraword = ch === '_' && i > 0 && /[A-Za-z0-9]/.test(source.charAt(i - 1));
      const opens = !intraword && Boolean(source.charAt(inner)) && !/\s/.test(source.charAt(inner));
      const close = opens && !unclosed.has(marker) ? findClose(source, inner + 1, marker) : -1;
      if (opens && close < 0) unclosed.add(marker);
      if (close < 0 || /\s/.test(source.charAt(close - 1))) {
        text += marker;
        i = inner;
        continue;
      }
      flush();
      out.push({ type: marker.length === 2 ? 'strong' : 'em', children: parseInline(source.slice(inner, close)) });
      i = close + marker.length;
    } else if (ch === 'h' && (i === 0 || !/[A-Za-z0-9]/.test(source.charAt(i - 1))) && /^https?:\/\//.test(source.slice(i, i + 8))) {
      const match = /^https?:\/\/[^\s<>]*[^\s<>.,:;"')\]!?*_]/.exec(source.slice(i));
      const href = match && safeHref(match[0]);
      if (!match || !href) {
        text += ch;
        i += 1;
        continue;
      }
      flush();
      out.push({ type: 'link', href, children: [{ type: 'text', value: match[0] }] });
      i += match[0].length;
    } else {
      text += ch;
      i += 1;
    }
  }
  flush();
  return out;
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  const at = (index: number) => lines[index] ?? '';
  let i = 0;
  while (i < lines.length) {
    const line = at(i);
    if (!line.trim()) {
      i += 1;
      continue;
    }
    const fence = FENCE.exec(line);
    if (fence) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !at(i).trimStart().startsWith(fence[1] ?? '')) {
        body.push(at(i));
        i += 1;
      }
      i += 1;
      blocks.push({ type: 'code', value: body.join('\n') });
      continue;
    }
    const heading = HEADING.exec(line);
    if (heading) {
      // The entry title is the page's h1, so # and ## both open a section.
      blocks.push({ type: 'heading', level: Math.min(4, Math.max(2, (heading[1] ?? '').length)) as 2 | 3 | 4, children: parseInline(heading[2] ?? '') });
      i += 1;
      continue;
    }
    if (RULE.test(line)) {
      blocks.push({ type: 'rule' });
      i += 1;
      continue;
    }
    if (QUOTE.test(line)) {
      const inner: string[] = [];
      while (i < lines.length && QUOTE.test(at(i))) {
        inner.push(at(i).replace(/^ {0,3}> ?/, ''));
        i += 1;
      }
      blocks.push({ type: 'quote', children: parseMarkdown(inner.join('\n')) });
      continue;
    }
    const first = BULLET.exec(line) ?? ORDERED.exec(line);
    if (first) {
      const ordered = !BULLET.test(line);
      const pattern = ordered ? ORDERED : BULLET;
      const items: string[] = [];
      while (i < lines.length) {
        const current = at(i);
        const item = pattern.exec(current);
        if (item) {
          items.push(item[2] ?? '');
        } else if (!current.trim()) {
          // A blank line continues the list only when another item follows.
          let next = i + 1;
          while (next < lines.length && !at(next).trim()) next += 1;
          if (next >= lines.length || !pattern.test(at(next))) break;
        } else if (/^\s/.test(current) || !startsBlock(current)) {
          items[items.length - 1] += `\n${current.trim()}`;
        } else {
          break;
        }
        i += 1;
      }
      blocks.push({ type: 'list', ordered, start: ordered ? Number(first[1] ?? 1) : 1, items: items.map(parseInline) });
      continue;
    }
    const paragraph: string[] = [];
    while (i < lines.length && at(i).trim() && (paragraph.length === 0 || !startsBlock(at(i)))) {
      paragraph.push(at(i).trim());
      i += 1;
    }
    blocks.push({ type: 'paragraph', children: parseInline(paragraph.join('\n')) });
  }
  return blocks;
}
