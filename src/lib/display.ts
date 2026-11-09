/** Small display helpers shared by Astro and React components. */

/** "Candidate A" → "CA"; "Jean-Luc Martin" → "JM". At most two letters, no party or colour cues. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.map((w) => Array.from(w)[0] ?? '').filter(Boolean);
  const picked = letters.length > 2 ? [letters[0], letters[letters.length - 1]] : letters;
  return picked.join('').toUpperCase();
}

/** Alphabetical order by surname (sort_name), falling back to the display name. French collation handles accents. */
export function compareBySortName(a: { name: string; sort_name?: string }, b: { name: string; sort_name?: string }): number {
  return new Intl.Collator('fr', { sensitivity: 'base' }).compare(a.sort_name ?? a.name, b.sort_name ?? b.name);
}

/** "CC-BY-SA-4.0" → "CC BY-SA 4.0"; "CC0-1.0" → "CC0 1.0"; "PDM-1.0" → "Public Domain Mark 1.0". */
export function licenseLabel(id: string): string {
  if (id.startsWith('PDM-')) return `Public Domain Mark ${id.slice(4)}`;
  if (id.startsWith('CC0-')) return `CC0 ${id.slice(4)}`;
  const m = id.match(/^CC-(BY(?:-SA)?)-(\d\.\d)$/);
  return m ? `CC ${m[1]} ${m[2]}` : id;
}

/** "fr" → "French". */
export function languageName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Label above a quote that is not in English, e.g. "Original quote (French)"; plain "Quote" otherwise. */
export function quoteLabel(lang: string | undefined): string {
  return !lang || lang === 'en' ? 'Quote' : `Original quote (${languageName(lang)})`;
}
