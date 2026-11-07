import { useEffect, useId, useState } from 'react';
import { formatDate } from '../lib/dates';
import { initials, quoteLabel } from '../lib/display';
import { hashForTopic, topicFromHash, type CompareCandidate, type CompareLine, type CompareTopic } from '../lib/compare';

interface Props {
  country: string;
  topics: CompareTopic[];
  /** Already in alphabetical order. */
  candidates: CompareCandidate[];
}

function Avatar({ name, photo }: { name: string; photo?: string }) {
  const box = 'h-8 w-8 shrink-0 rounded-full';
  return photo ? (
    <img src={`/people/${photo}`} alt={`Portrait of ${name}`} width={32} height={32} loading="lazy" decoding="async" className={`${box} bg-surface object-cover object-top`} />
  ) : (
    <span aria-hidden="true" className={`${box} flex items-center justify-center bg-line text-xs font-semibold text-muted`}>
      {initials(name)}
    </span>
  );
}

function Line({ line }: { line: CompareLine | undefined }) {
  if (!line || line.status === 'not_found') {
    return (
      <p className="mt-1 text-muted">
        No clear position found as of{' '}
        {line ? <time dateTime={line.checked_on}>{formatDate(line.checked_on)}</time> : 'this date'}.
      </p>
    );
  }
  const host = new URL(line.source_url).hostname.replace(/^www\./, '');
  return (
    <>
      <p className="mt-1">{line.summary}</p>
      <details>
        <summary className="flex min-h-11 items-center gap-2 py-2 text-sm font-medium text-accent">
          <span className="underline underline-offset-4">Source and quote</span>
          <svg className="chevron h-4 w-4 shrink-0 text-muted transition-transform" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
        <div className="pb-2 pt-1">
          {line.quote && (
            <figure className="mb-2">
              <figcaption className="text-sm text-muted">{quoteLabel(line.quote_lang)}</figcaption>
              <blockquote lang={line.quote_lang} className="border-l-4 border-line pl-3 italic">
                {line.quote}
              </blockquote>
            </figure>
          )}
          <p className="text-sm text-muted">
            Source:{' '}
            <a href={line.source_url} rel="noopener noreferrer" className="text-accent underline underline-offset-2">
              {host}
            </a>{' '}
            · published <time dateTime={line.source_date}>{formatDate(line.source_date)}</time> · checked{' '}
            <time dateTime={line.last_checked}>{formatDate(line.last_checked)}</time>
          </p>
        </div>
      </details>
    </>
  );
}

export default function CompareIsland({ country, topics, candidates }: Props) {
  const slugs = topics.map((t) => t.slug);
  const [selected, setSelected] = useState(slugs[0] ?? '');
  const name = useId();

  // Read the topic from the URL after hydration (server and first client render both show the first topic).
  useEffect(() => {
    const sync = () => setSelected(topicFromHash(window.location.hash, slugs));
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choose = (slug: string) => {
    setSelected(slug);
    window.history.replaceState(null, '', hashForTopic(slug));
  };

  const topic = topics.find((t) => t.slug === selected) ?? topics[0];
  if (!topic) return null;

  return (
    <div>
      <fieldset className="mt-6">
        <legend className="sr-only">Topic</legend>
        <div className="flex flex-wrap gap-2">
          {topics.map((t) => (
            <div key={t.slug} className="relative">
              <input
                type="radio"
                name={name}
                id={`${name}-${t.slug}`}
                value={t.slug}
                checked={t.slug === selected}
                onChange={() => choose(t.slug)}
                className="peer sr-only"
              />
              <label
                htmlFor={`${name}-${t.slug}`}
                className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line px-4 text-accent hover:bg-accent-soft peer-checked:border-accent peer-checked:bg-accent peer-checked:text-white peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
              >
                {t.name}
              </label>
            </div>
          ))}
        </div>
      </fieldset>

      <section className="mt-8" aria-live="polite" aria-labelledby={`${name}-heading`}>
        <h2 id={`${name}-heading`} className="text-2xl font-semibold">
          {topic.name}
        </h2>
        <p className="mt-1 text-muted">{topic.description}</p>
        <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
          {candidates.map((c) => (
            <li key={c.slug} className="p-4">
              <p className="flex items-center gap-3 font-semibold">
                <Avatar name={c.name} photo={c.photo} />
                <a href={`/${country}/candidates/${c.slug}/`} className="text-ink underline-offset-4 hover:text-accent hover:underline">
                  {c.name}
                </a>
              </p>
              <Line line={c.lines[topic.slug]} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
