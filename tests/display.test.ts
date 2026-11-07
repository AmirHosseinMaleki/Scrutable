import { describe, expect, it } from 'vitest';
import { initials, languageName, licenseLabel, quoteLabel } from '../src/lib/display';

describe('initials', () => {
  it.each([
    ['Candidate A', 'CA'],
    ['Jean-Luc Martin', 'JM'],
    ['Marie de la Tour', 'MT'],
    ['Cher', 'C'],
    ['  ', ''],
    ['élodie Roux', 'ÉR'],
  ])('%s → %s', (name, out) => expect(initials(name)).toBe(out));
});

describe('licenseLabel', () => {
  it.each([
    ['CC-BY-SA-4.0', 'CC BY-SA 4.0'],
    ['CC-BY-3.0', 'CC BY 3.0'],
    ['CC0-1.0', 'CC0 1.0'],
    ['PDM-1.0', 'Public Domain Mark 1.0'],
  ])('%s → %s', (id, out) => expect(licenseLabel(id)).toBe(out));
});

describe('quote labels', () => {
  it('names the language', () => expect(languageName('fr')).toBe('French'));
  it('labels non-English quotes as originals', () => expect(quoteLabel('fr')).toBe('Original quote (French)'));
  it('uses a plain label for English or unknown', () => {
    expect(quoteLabel('en')).toBe('Quote');
    expect(quoteLabel(undefined)).toBe('Quote');
  });
});
