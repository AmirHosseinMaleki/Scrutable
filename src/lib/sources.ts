/** Helpers for walking content and finding the facts (objects with source fields) inside it. */

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export interface Fact {
  /** Dotted path inside the entry, e.g. "positions.2". */
  path: string;
  source_url?: unknown;
  source_date?: unknown;
  last_checked?: unknown;
  /** Set for explicit gaps ("not_found") that only record the date we looked. */
  checked_on?: unknown;
}

const SOURCE_KEYS = ['source_url', 'source_date', 'last_checked'] as const;

/** Every object in `data` that carries any source field, or a checked_on gap marker. */
export function collectFacts(data: unknown, path = ''): Fact[] {
  const facts: Fact[] = [];
  if (Array.isArray(data)) {
    data.forEach((item, i) => facts.push(...collectFacts(item, path ? `${path}.${i}` : String(i))));
  } else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (SOURCE_KEYS.some((k) => k in obj) || 'checked_on' in obj) {
      facts.push({
        path,
        source_url: obj.source_url,
        source_date: obj.source_date,
        last_checked: obj.last_checked,
        checked_on: obj.checked_on,
      });
    }
    for (const [k, v] of Object.entries(obj)) facts.push(...collectFacts(v, path ? `${path}.${k}` : k));
  }
  return facts;
}

/** The oldest last_checked / checked_on date among all facts in `data`, if any. */
export function oldestChecked(...data: unknown[]): string | undefined {
  const dates = data
    .flatMap((d) => collectFacts(d))
    .map((f) => (typeof f.last_checked === 'string' ? f.last_checked : f.checked_on))
    .filter((d): d is string => typeof d === 'string')
    .sort();
  return dates[0];
}

/** All string values in `data` with the key they sit under (used for wording checks). */
export function collectStrings(data: unknown, key = ''): { key: string; value: string }[] {
  if (typeof data === 'string') return [{ key, value: data }];
  if (Array.isArray(data)) return data.flatMap((d) => collectStrings(d, key));
  if (data && typeof data === 'object') {
    return Object.entries(data as Record<string, unknown>).flatMap(([k, v]) => collectStrings(v, k));
  }
  return [];
}
