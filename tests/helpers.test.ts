import { describe, expect, it } from 'vitest';
import { countSentences } from '../src/content/schemas';
import { daysBetween, formatDate } from '../src/lib/dates';
import { collectFacts, oldestChecked } from '../src/lib/sources';

describe('dates', () => {
  it('counts days between ISO dates', () => {
    expect(daysBetween('2026-11-01', '2026-12-01')).toBe(30);
    expect(daysBetween('2026-12-01', '2026-11-01')).toBe(-30);
  });
  it('formats dates in a fixed locale', () => {
    expect(formatDate('2026-11-06')).toBe('6 November 2026');
  });
});

describe('countSentences', () => {
  it.each([
    ['One.', 1],
    ['One. Two.', 2],
    ['One. Two! Three?', 3],
    ['No final stop', 1],
    ['Version 2.5 is fine.', 1],
  ])('%s → %i', (text, n) => expect(countSentences(text)).toBe(n));
});

describe('sources', () => {
  const data = { a: { source_url: 'u', source_date: '2026-01-01', last_checked: '2026-02-01' }, b: [{ status: 'not_found', checked_on: '2026-01-15' }] };
  it('finds facts, including gaps', () => expect(collectFacts(data).map((f) => f.path)).toEqual(['a', 'b.0']));
  it('finds the oldest check date', () => expect(oldestChecked(data)).toBe('2026-01-15'));
  it('returns undefined when nothing is sourced', () => expect(oldestChecked({ x: 1 })).toBeUndefined());
});
