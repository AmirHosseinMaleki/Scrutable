/** Pure helpers and data shapes for the Compare island (no Astro or React imports, so they are unit tested). */

export type CompareLine =
  | {
      status: 'found';
      summary: string;
      quote?: string;
      quote_lang?: string;
      source_url: string;
      source_date: string;
      last_checked: string;
      source_date_is_retrieval?: boolean;
    }
  | { status: 'not_found'; checked_on: string };

export interface CompareTopic {
  slug: string;
  name: string;
  description: string;
}

export interface CompareCandidate {
  slug: string;
  name: string;
  /** File name in public/people/, if the person has a photo. */
  photo?: string;
  /** One line per topic slug. */
  lines: Record<string, CompareLine>;
}

const PREFIX = '#topic-';

/** The topic named by a URL hash such as "#topic-topic-2", or the first topic if the hash is missing or unknown. */
export function topicFromHash(hash: string, slugs: string[]): string {
  const wanted = hash.startsWith(PREFIX) ? hash.slice(PREFIX.length) : '';
  return slugs.includes(wanted) ? wanted : (slugs[0] ?? '');
}

export function hashForTopic(slug: string): string {
  return `${PREFIX}${slug}`;
}
