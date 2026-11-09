/**
 * pnpm verify:quotes [--strict]
 * Fetches the source page of every quote in real (non-sample) candidacies and checks that the quote appears
 * there word for word. Needs the network, so it is not part of the four-command gate: run it before opening a
 * content PR and paste the output into the description.
 *
 * Exit 1 if any quote is NOT FOUND. Pages that cannot be read are reported as "unverified" and only fail with --strict.
 */
import { collectQuotes, containsQuote, htmlToText } from '../src/lib/quotes';
import { loadContent } from './load-content';

const strict = process.argv.includes('--strict');
const { loaded } = loadContent();
const refs = collectQuotes(loaded);

if (refs.length === 0) {
  console.log('No quotes in real candidacies to verify.');
  process.exit(0);
}

const pages = new Map<string, Promise<{ text?: string; error?: string }>>();
function page(url: string) {
  if (!pages.has(url)) {
    pages.set(
      url,
      fetch(url, { headers: { 'user-agent': 'Scrutable quote check (read-only)' }, redirect: 'follow', signal: AbortSignal.timeout(30_000) })
        .then(async (r) => (r.ok ? { text: htmlToText(await r.text()) } : { error: `HTTP ${r.status}` }))
        .catch((e: Error) => ({ error: e.message })),
    );
  }
  return pages.get(url)!;
}

let missing = 0;
let unverified = 0;
for (const ref of refs) {
  const result = await page(ref.url);
  if (result.error || result.text === undefined) {
    unverified += 1;
    console.log(`unverified  ${ref.file} ${ref.path}: could not read ${ref.url} (${result.error})`);
  } else if (containsQuote(result.text, ref.quote)) {
    console.log(`ok          ${ref.file} ${ref.path}`);
  } else {
    missing += 1;
    console.log(`NOT FOUND   ${ref.file} ${ref.path}: "${ref.quote.slice(0, 70)}…" is not on ${ref.url}`);
  }
}

console.log(`\n${refs.length} quote(s): ${refs.length - missing - unverified} verified, ${missing} not found, ${unverified} unverified.`);
process.exit(missing > 0 || (strict && unverified > 0) ? 1 : 0);
