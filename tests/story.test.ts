import { describe, expect, it } from 'vitest';
import { countSentences, electionSchema } from '../src/content/schemas';
import { earlierRuns, storyFacts } from '../src/lib/story';

const src = { source_url: 'https://example.com/s', source_date: '2026-10-01', last_checked: '2026-11-01' };
const make = (n: number, family: string | undefined, withRunoff: boolean, extra?: { person: string }, candidates?: number) =>
  electionSchema.parse({
    country: 'fr',
    kind: 'presidential',
    name: `E${n}`,
    status: 'past',
    sample: true,
    date: `${2000 + n}-04-01`,
    rounds: [
      { round: 1, date: `${2000 + n}-04-01`, turnout: 70 - n, ...(candidates ? { candidates } : {}), results: [{ name: 'W', person: `w${n}`, ...(family ? { family } : {}), share: 30 }, { name: 'X', family: 'Z', ...(extra ?? {}), share: 20 }], ...src },
      ...(withRunoff ? [{ round: 2, date: `${2000 + n}-04-15`, turnout: 69 - n, results: [{ name: 'W', person: `w${n}`, ...(family ? { family } : {}), share: 55 }, { name: 'X', family: 'Z', ...(extra ?? {}), share: 45 }], ...src }] : []),
    ],
    winner: { name: 'W', person: `w${n}`, ...(family ? { family } : {}) },
    defining_event: { status: 'found', text: 'Something.', ...src },
  });

const elections = [make(1, 'B', true), make(2, 'A', false), make(3, 'B', true, { person: 'cand' })];

describe('storyFacts', () => {
  const facts = storyFacts(elections);
  it('returns three facts, each at most 2 sentences', () => {
    expect(facts).toHaveLength(3);
    for (const f of facts) expect(countSentences(f.text)).toBeLessThanOrEqual(2);
  });
  it('compares first-round turnout of the oldest and newest election', () => expect(facts[0]!.text).toBe('69% in 2001, 67% in 2003.'));
  it('lists families alphabetically, not by size', () => expect(facts[1]!.text).toBe('A: 1, B: 2.'));
  it('counts elections decided in a second round', () => expect(facts[2]!.text).toBe('2 of 3 elections.'));
  it('returns nothing without past elections', () => expect(storyFacts([])).toEqual([]));
});

describe('storyFacts without political families', () => {
  const noFamily = [make(1, undefined, true, undefined, 16), make(2, undefined, false, undefined, 12), make(3, undefined, true, undefined, 11)];
  it('uses first-round candidate counts as the middle fact', () => {
    const facts = storyFacts(noFamily);
    expect(facts.map((f) => f.id)).toEqual(['turnout', 'candidates', 'runoffs']);
    expect(facts[1]!.text).toBe('16 in 2001, 11 in 2003.');
  });
  it('falls back to two facts when neither families nor counts are complete', () => {
    const facts = storyFacts([make(1, undefined, true), make(2, undefined, true)]);
    expect(facts.map((f) => f.id)).toEqual(['turnout', 'runoffs']);
  });
  it('does not show families when only some winners have one', () => {
    expect(storyFacts([make(1, 'A', true, undefined, 10), make(2, undefined, true, undefined, 9)]).map((f) => f.id)).toContain('candidates');
  });
});

describe('earlierRuns', () => {
  it('finds a person in result lines, newest first, last round only', () => {
    const runs = earlierRuns('cand', elections);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({ round: 2, share: 45, won: false });
  });
  it('marks wins', () => expect(earlierRuns('w1', elections)[0]).toMatchObject({ won: true, round: 2 }));
  it('returns an empty list for people who never ran', () => expect(earlierRuns('nobody', elections)).toEqual([]));
});
