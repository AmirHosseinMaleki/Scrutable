import { describe, expect, it } from 'vitest';
import { electionSchema } from '../src/content/schemas';

const src = { source_url: 'https://example.com/s', source_date: '2026-10-01', last_checked: '2026-11-01' };
const base = {
  kind: 'parliamentary',
  name: 'Chamber 2025',
  status: 'past',
  sample: true,
  date: '2025-10-04',
  rounds: [{ round: 1, date: '2025-10-04', seats_total: 200, results: [{ name: 'A', share: 34.5, seats: 80 }, { name: 'B', share: 23.3, seats: 52 }], ...src }],
  winner: { name: 'A' },
};
const termFacts = [
  { status: 'found', label: 'Prime ministers', items: ['X'], ...src },
  { status: 'found', label: 'Early dissolutions', items: [], ...src },
  { status: 'not_found', label: 'Referendums', checked_on: '2026-11-01' },
];

describe('election schema for more than one country', () => {
  it('defaults the type to presidential, so French files stay valid', () => {
    expect(electionSchema.parse({ ...base, kind: undefined, country: 'cz', term_facts: termFacts }).kind).toBe('presidential');
  });
  it('accepts seats, electoral votes and results without a turnout figure', () => {
    const e = electionSchema.parse({ ...base, country: 'cz', term_facts: termFacts });
    expect(e.rounds[0]!.results[0]!.seats).toBe(80);
    expect(e.rounds[0]!.turnout).toBeUndefined();
    const us = electionSchema.parse({ ...base, kind: 'presidential', country: 'us', rounds: [{ ...base.rounds[0], results: [{ name: 'A', share: 50, electoral_votes: 312 }] }], term_facts: termFacts });
    expect(us.rounds[0]!.results[0]!.electoral_votes).toBe(312);
  });
  it('rejects an unknown election type', () => {
    expect(electionSchema.safeParse({ ...base, kind: 'municipal', country: 'cz', term_facts: termFacts }).success).toBe(false);
  });
  it('requires a term block for France and term facts (or a term block) elsewhere', () => {
    const fr = electionSchema.safeParse({ ...base, country: 'fr', term_facts: termFacts });
    expect(fr.success).toBe(false);
    expect(electionSchema.safeParse({ ...base, country: 'cz' }).success).toBe(false);
    expect(electionSchema.safeParse({ ...base, country: 'cz', term_facts: termFacts }).success).toBe(true);
  });
  it('checks every term fact like any other fact: a found one needs its source, a gap only the date', () => {
    expect(electionSchema.safeParse({ ...base, country: 'cz', term_facts: [{ status: 'found', label: 'X', items: [] }] }).success).toBe(false);
    expect(electionSchema.safeParse({ ...base, country: 'cz', term_facts: [{ status: 'not_found', label: 'X' }] }).success).toBe(false);
  });
});

describe('election date', () => {
  const upcoming = {
    country: 'cz',
    kind: 'presidential',
    name: 'Presidential election 2028',
    status: 'upcoming',
    sample: true,
    key_dates: [{ label: 'The current term ends', date: '2028-03-09', ...src }],
  };
  it('lets an upcoming election have no date while the date is unannounced', () => {
    const e = electionSchema.safeParse(upcoming);
    expect(e.success).toBe(true);
    expect(e.data!.date).toBeUndefined();
  });
  it('still accepts an upcoming election with a date', () => {
    expect(electionSchema.safeParse({ ...upcoming, date: '2028-02-01' }).success).toBe(true);
  });
  it('requires a date for a past election', () => {
    const { date: _date, ...undated } = base;
    const r = electionSchema.safeParse({ ...undated, country: 'cz', term_facts: termFacts });
    expect(r.success).toBe(false);
    expect(r.error!.issues.some((i) => i.path.join('.') === 'date' && i.message === 'Past elections need a date')).toBe(true);
  });
  it('still requires key_dates for an upcoming election', () => {
    const r = electionSchema.safeParse({ ...upcoming, key_dates: [] });
    expect(r.success).toBe(false);
    expect(r.error!.issues.some((i) => i.message === 'Upcoming elections need key_dates')).toBe(true);
  });
});

describe('result lines and sources that are not France-shaped', () => {
  const senate = { ...base, kind: 'senate', country: 'us', winner: { name: 'A' }, term_facts: termFacts };
  const line = (l: object, extra: object = {}) => ({ ...senate, rounds: [{ ...base.rounds[0], ...extra, results: [l] }] });
  it('allows a result line with seats and no share', () => {
    expect(electionSchema.safeParse(line({ name: 'A', seats: 17 })).success).toBe(true);
  });
  it('still needs at least a share, seats or electoral votes on every line', () => {
    const r = electionSchema.safeParse(line({ name: 'A' }));
    expect(r.success).toBe(false);
    expect(r.error!.issues.some((i) => i.message.includes('share, seats or electoral votes'))).toBe(true);
  });
  it('accepts further sources on a round, each needing its own source fields', () => {
    const extra = { label: 'Turnout table', ...src };
    expect(electionSchema.safeParse(line({ name: 'A', seats: 1 }, { also_sources: [extra] })).success).toBe(true);
    expect(electionSchema.safeParse(line({ name: 'A', seats: 1 }, { also_sources: [{ ...extra, source_url: undefined }] })).success).toBe(false);
  });
  it('lets term facts say the term is still running, off by default', () => {
    expect(electionSchema.parse({ ...senate }).term_ongoing).toBe(false);
    expect(electionSchema.parse({ ...senate, term_ongoing: true }).term_ongoing).toBe(true);
  });
});
