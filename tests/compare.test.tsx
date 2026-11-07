import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CompareIsland from '../src/components/CompareIsland';
import { hashForTopic, topicFromHash, type CompareCandidate, type CompareTopic } from '../src/lib/compare';

const topics: CompareTopic[] = [
  { slug: 't1', name: 'Topic 1', description: 'First topic.' },
  { slug: 't2', name: 'Topic 2', description: 'Second topic.' },
];
const src = { source_url: 'https://example.com/s', source_date: '2026-10-01', last_checked: '2026-11-01' };
const candidates: CompareCandidate[] = [
  { slug: 'a', name: 'Candidate A', lines: { t1: { status: 'found', summary: 'A says one.', quote: 'Exact words.', ...src }, t2: { status: 'found', summary: 'A says two.', ...src } } },
  { slug: 'b', name: 'Candidate B', lines: { t1: { status: 'not_found', checked_on: '2026-11-01' }, t2: { status: 'found', summary: 'B says two.', ...src } } },
];

const html = () => renderToStaticMarkup(<CompareIsland country="fr" topics={topics} candidates={candidates} />);

describe('topicFromHash', () => {
  const slugs = ['t1', 't2'];
  it('reads a known topic from the hash', () => expect(topicFromHash('#topic-t2', slugs)).toBe('t2'));
  it('falls back to the first topic for empty, unknown or malformed hashes', () => {
    for (const h of ['', '#', '#nope', '#topic-zzz', '#t2']) expect(topicFromHash(h, slugs)).toBe('t1');
  });
  it('round-trips with hashForTopic', () => expect(topicFromHash(hashForTopic('t2'), slugs)).toBe('t2'));
});

describe('CompareIsland (server render)', () => {
  it('offers every topic as a radio in one group, first one checked', () => {
    const out = html();
    expect(out.match(/type="radio"/g)).toHaveLength(2);
    expect(out).toMatch(/<fieldset/);
    expect(out).toMatch(/<legend[^>]*>Topic<\/legend>/);
    expect(out.match(/checked=""/g)).toHaveLength(1);
  });
  it('shows one line per candidate for the selected topic, alphabetically', () => {
    const out = html();
    expect(out.indexOf('Candidate A')).toBeGreaterThan(-1);
    expect(out.indexOf('Candidate A')).toBeLessThan(out.indexOf('Candidate B'));
    expect(out).toContain('A says one.');
    expect(out).not.toContain('A says two.');
  });
  it('shows an explicit gap, never a guess', () => {
    expect(html()).toContain('No clear position found as of');
    expect(html()).toContain('1 November 2026');
  });
  it('puts the quote and source behind a toggle', () => {
    const out = html();
    expect(out).toContain('Exact words.');
    expect(out).toContain('Source and quote');
    expect(out).toContain('example.com');
  });
  it('links each candidate to their page', () => expect(html()).toContain('href="/fr/candidates/a/"'));
});
