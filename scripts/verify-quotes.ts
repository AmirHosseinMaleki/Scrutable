/**
 * pnpm verify:quotes [--strict]
 * Fetches the source page of every quote in real (non-sample) candidacies and checks that the quote appears
 * there word for word. Needs the network, so it is not part of the four-command gate: run it before opening a
 * content PR and paste the output into the description.
 *
 * Exit 1 if any quote is NOT FOUND. Pages that cannot be read are reported as "unverified" and only fail with --strict.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cleanPdfText, collectQuotes, containsQuote, htmlToText, isPdfUrl, pdfFileName } from '../src/lib/quotes';
import { loadContent } from './load-content';

const strict = process.argv.includes('--strict');
const { loaded } = loadContent();
const refs = collectQuotes(loaded);

if (refs.length === 0) {
  console.log('No quotes in real candidacies to verify.');
  process.exit(0);
}

/**
 * PDFs: some sites refuse scripted downloads, so a copy saved by hand in docs/inbox/ under the URL's file name is
 * used first (docs/inbox/ is git-ignored). Otherwise the PDF is fetched. Text is extracted with poppler's
 * `pdftotext` (brew install poppler); without it PDF quotes are reported as "unverified".
 */
const INBOX = join(import.meta.dirname, '..', 'docs', 'inbox');

async function pdfText(url: string): Promise<{ text?: string; error?: string }> {
  let file = join(INBOX, pdfFileName(url));
  if (!existsSync(file)) {
    const r = await fetch(url, { headers: { 'user-agent': 'Scrutable quote check (read-only)' }, redirect: 'follow', signal: AbortSignal.timeout(60_000) }).catch(
      (e: Error) => e,
    );
    if (r instanceof Error) return { error: `${r.message}; save a copy as docs/inbox/${pdfFileName(url)}` };
    if (!r.ok) return { error: `HTTP ${r.status}; save a copy as docs/inbox/${pdfFileName(url)}` };
    file = join(mkdtempSync(join(tmpdir(), 'scrutable-pdf-')), 'source.pdf');
    writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  }
  try {
    return { text: cleanPdfText(execFileSync('pdftotext', [file, '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })) };
  } catch (e) {
    return { error: `pdftotext failed (${(e as Error).message.split('\n')[0]})` };
  }
}

const pages = new Map<string, Promise<{ text?: string; error?: string }>>();
function page(url: string) {
  if (!pages.has(url)) {
    pages.set(
      url,
      isPdfUrl(url)
        ? pdfText(url)
        : fetch(url, { headers: { 'user-agent': 'Scrutable quote check (read-only)' }, redirect: 'follow', signal: AbortSignal.timeout(30_000) })
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
