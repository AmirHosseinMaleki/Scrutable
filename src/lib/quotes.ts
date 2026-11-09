/**
 * Helpers to check that a quote really appears on the page it cites. Pure functions, so they are unit tested;
 * scripts/verify-quotes.ts does the network part.
 */
import type { Loaded } from './validation';

export interface QuoteRef {
  file: string;
  /** Where in the entry the quote sits, e.g. "positions.2.quote". */
  path: string;
  quote: string;
  url: string;
}

/** Every quote of real (non-sample) candidacies, with the page it must appear on. */
export function collectQuotes(content: Loaded): QuoteRef[] {
  const refs: QuoteRef[] = [];
  for (const { file, data } of content.candidacies) {
    const c = data as any;
    if (c.sample) continue;
    (c.positions ?? []).forEach((p: any, i: number) => {
      if (p.status === 'found' && p.quote) refs.push({ file, path: `positions.${i}.quote`, quote: p.quote, url: p.source_url });
    });
    if (c.declaration?.own?.quote) refs.push({ file, path: 'declaration.own.quote', quote: c.declaration.own.quote, url: c.declaration.own.source_url });
  }
  return refs;
}

const ENTITIES: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", rsquo: '’', lsquo: '‘', laquo: '«', raquo: '»', hellip: '…', ndash: '–', mdash: '—',
  eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë', agrave: 'à', acirc: 'â', ccedil: 'ç', icirc: 'î', iuml: 'ï', ocirc: 'ô', ugrave: 'ù', ucirc: 'û', uuml: 'ü',
  Eacute: 'É', Egrave: 'È', Agrave: 'À', Ccedil: 'Ç',
};

/** Visible text of an HTML page: scripts, styles and tags removed, common entities decoded. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => ENTITIES[name] ?? m);
}

/** Makes text comparable: Unicode NFC, one kind of apostrophe and quote, no-break spaces and repeated spaces collapsed. */
export function normalizeForMatch(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[   ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True when the quote appears word for word (apart from spacing and quote style) in the page text. Case matters. */
export function containsQuote(pageText: string, quote: string): boolean {
  const q = normalizeForMatch(quote);
  return q.length > 0 && normalizeForMatch(pageText).includes(q);
}
