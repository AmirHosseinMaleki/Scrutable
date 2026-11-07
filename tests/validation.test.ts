import { describe, expect, it } from 'vitest';
import { validateContent } from '../src/lib/validation';
import { TODAY, validContent } from './fixtures';

const run = (mutate?: (c: ReturnType<typeof validContent>) => void, today = TODAY, photoExists = () => true) => {
  const c = validContent();
  mutate?.(c);
  return validateContent(c, today, { photoExists });
};
const errors = (...a: Parameters<typeof run>) => run(...a).filter((i) => i.level === 'error');
const warnings = (...a: Parameters<typeof run>) => run(...a).filter((i) => i.level === 'warning');

describe('validateContent', () => {
  it('accepts a valid content set', () => {
    expect(run()).toEqual([]);
  });

  it('fails when a position has no source_url', () => {
    const e = errors((c) => {
      delete (c.candidacies[0]!.data as any).positions[0].source_url;
    });
    expect(e.some((i) => i.message.includes('source_url'))).toBe(true);
  });

  it.each(['source_date', 'last_checked'])('fails when a promise has no %s', (field) => {
    const e = errors((c) => {
      delete (c.candidacies[2]!.data as any).promises[0][field];
    });
    expect(e.some((i) => i.message.includes(field))).toBe(true);
  });

  it('fails when an election result round has no source', () => {
    const e = errors((c) => {
      delete (c.elections[1]!.data as any).rounds[0].source_url;
    });
    expect(e.length).toBeGreaterThan(0);
  });

  it('fails on an unquoted (Date) YAML date', () => {
    expect(errors((c) => ((c.candidacies[0]!.data as any).positions[0].source_date = new Date()))).not.toEqual([]);
  });

  it('warns, but does not fail, when last_checked is more than 30 days old', () => {
    const c = validContent();
    expect(validateContent(c, '2026-12-02').filter((i) => i.level === 'warning')).not.toEqual([]); // 31 days after 2026-11-01
    expect(validateContent(c, '2026-12-02').filter((i) => i.level === 'error')).toEqual([]);
  });

  it('does not warn at exactly 30 days', () => {
    expect(warnings(undefined, '2026-12-01')).toEqual([]);
  });

  it('fails on last_checked in the future or before source_date', () => {
    expect(errors((c) => ((c.candidacies[0]!.data as any).positions[0].last_checked = '2026-12-01')).length).toBeGreaterThan(0);
    expect(errors((c) => ((c.candidacies[0]!.data as any).positions[0].last_checked = '2026-09-01')).length).toBeGreaterThan(0);
  });

  it('fails when a candidate is missing a position for a topic (same template for everyone)', () => {
    const e = errors((c) => (c.candidacies[1]!.data as any).positions.pop());
    expect(e.some((i) => i.message.includes('exactly one'))).toBe(true);
  });

  it('accepts an explicit gap instead of a position', () => {
    expect(errors((c) => ((c.candidacies[1]!.data as any).positions[1] = { topic: 't2', status: 'not_found', checked_on: '2026-11-01' }))).toEqual([]);
  });

  it('fails when a position topic does not exist', () => {
    expect(errors((c) => ((c.candidacies[0]!.data as any).positions[1].topic = 'nope')).length).toBeGreaterThan(0);
  });

  it('fails when a winner has other than 3 promise slots', () => {
    expect(errors((c) => (c.candidacies[2]!.data as any).promises.pop()).some((i) => i.message.includes('3 promise'))).toBe(true);
  });

  it('allows a promise gap but never an invented promise', () => {
    expect(errors((c) => ((c.candidacies[2]!.data as any).promises[2] = { status: 'not_found', checked_on: '2026-11-01' }))).toEqual([]);
    expect(errors((c) => delete (c.candidacies[2]!.data as any).promises[2].rated_by).length).toBeGreaterThan(0);
  });

  it('fails on promises for upcoming candidates', () => {
    expect(errors((c) => ((c.candidacies[0]!.data as any).promises = [{ status: 'not_found', checked_on: '2026-11-01' }])).length).toBeGreaterThan(0);
  });

  it('fails on banned wording but allows it inside a quote', () => {
    expect(errors((c) => ((c.candidacies[0]!.data as any).positions[0].summary = 'A radical plan.')).length).toBeGreaterThan(0);
    expect(errors((c) => { const pos = (c.candidacies[0]!.data as any).positions[0]; pos.quote = 'A radical plan, in their words.'; pos.quote_lang = 'en'; })).toEqual([]);
  });

  it('fails on card text longer than 2 sentences', () => {
    expect(errors((c) => ((c.candidacies[0]!.data as any).positions[0].summary = 'One. Two. Three.')).length).toBeGreaterThan(0);
  });

  it('fails on placeholder sources in content that is not marked sample', () => {
    const e = errors((c) => {
      const d = c.candidacies[0]!.data as any;
      d.sample = false;
      (c.people[0]!.data as any).sample = false;
      (c.people[0]!.data as any).name = 'Jane Doe';
    });
    expect(e.some((i) => i.message.includes('placeholder source'))).toBe(true);
  });

  it('fails when a placeholder name is not marked sample', () => {
    expect(errors((c) => ((c.people[0]!.data as any).sample = false, ((c.people[0]!.data as any).name = 'Candidate A'))).length).toBeGreaterThan(0);
  });

  it('fails on broken references', () => {
    expect(errors((c) => ((c.candidacies[0]!.data as any).person = 'ghost')).length).toBeGreaterThan(0);
    expect(errors((c) => ((c.elections[1]!.data as any).winner.person = 'ghost')).length).toBeGreaterThan(0);
  });

  it('fails when the winner is not first in the final round', () => {
    expect(errors((c) => ((c.elections[1]!.data as any).rounds[0].results[1].share = 45)).some((i) => i.message.includes('not first'))).toBe(true);
  });

  it('fails when shares add up to more than 100', () => {
    expect(errors((c) => ((c.elections[1]!.data as any).rounds[0].results[1].share = 70)).length).toBeGreaterThan(0);
  });

  it('fails when a past election has no winner candidacy file', () => {
    expect(errors((c) => c.candidacies.pop()).length).toBeGreaterThan(0);
  });

  describe('photos and quotes', () => {
    const photo = (over: Record<string, unknown> = {}) => ({
      file: 'portrait.jpg',
      author: 'A. Photographer',
      license: 'CC-BY-SA-4.0',
      license_url: 'https://creativecommons.org/licenses/by-sa/4.0/',
      source_url: 'https://commons.wikimedia.org/wiki/File:Portrait.jpg',
      source_date: '2026-10-01',
      last_checked: '2026-11-01',
      ...over,
    });
    const realPerson = (c: ReturnType<typeof validContent>, p: Record<string, unknown>) => {
      const person = c.people[0]!.data as any;
      person.sample = false;
      person.name = 'Jane Doe';
      person.photo = p;
      (c.candidacies[0]!.data as any).sample = false;
      // real content may not use placeholder sources
      for (const pos of (c.candidacies[0]!.data as any).positions) pos.source_url = 'https://www.gouvernement.fr/s';
      (c.candidacies[0]!.data as any).profile.source_url = 'https://www.gouvernement.fr/s';
    };

    it('accepts a sample person with a sample photo', () => {
      expect(errors((c) => ((c.people[0]!.data as any).photo = photo({ file: 'portrait.svg', source_url: 'https://example.com/p' })))).toEqual([]);
    });
    it('accepts a real photo from Wikimedia Commons with an open licence', () => {
      expect(errors((c) => realPerson(c, photo()))).toEqual([]);
    });
    it('fails when the photo file is missing from public/people', () => {
      expect(errors((c) => realPerson(c, photo()), TODAY, () => false).some((i) => i.message.includes('not in public/people'))).toBe(true);
    });
    it('fails on a real photo that does not come from Commons', () => {
      expect(errors((c) => realPerson(c, photo({ source_url: 'https://www.example-news.fr/pic' }))).some((i) => i.message.includes('commons.wikimedia.org'))).toBe(true);
    });
    it('fails on licences that need permission', () => {
      expect(errors((c) => realPerson(c, photo({ license: 'CC-BY-NC-4.0' }))).length).toBeGreaterThan(0);
    });
    it('fails without author or licence link', () => {
      expect(errors((c) => realPerson(c, photo({ author: '' }))).length).toBeGreaterThan(0);
      expect(errors((c) => { realPerson(c, photo()); delete ((c.people[0]!.data as any).photo).license_url; }).length).toBeGreaterThan(0);
    });
    it('fails on a real photo that is an svg', () => {
      expect(errors((c) => realPerson(c, photo({ file: 'portrait.svg' }))).some((i) => i.message.includes('not an svg'))).toBe(true);
    });
    it('warns when a photo was last checked more than 30 days ago', () => {
      expect(warnings((c) => ((c.people[0]!.data as any).photo = photo({ source_url: 'https://example.com/p', last_checked: '2026-09-01' }))).length).toBeGreaterThan(0);
    });
    it('requires quote_lang with a quote', () => {
      expect(errors((c) => ((c.candidacies[0]!.data as any).positions[0].quote = 'Words.')).some((i) => i.message.includes('quote_lang'))).toBe(true);
      expect(errors((c) => { const pos = (c.candidacies[0]!.data as any).positions[0]; pos.quote = 'Mots.'; pos.quote_lang = 'fr'; })).toEqual([]);
    });
  });
});
