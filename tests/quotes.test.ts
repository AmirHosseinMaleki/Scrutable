import { describe, expect, it } from 'vitest';
import { collectQuotes, containsQuote, htmlToText, normalizeForMatch } from '../src/lib/quotes';
import { compareBySortName } from '../src/lib/display';
import { validContent } from './fixtures';

describe('htmlToText', () => {
  it('drops scripts, styles, comments and tags', () => {
    const html = '<style>p{}</style><script>var a="Je suis";</script><!-- hidden --><p>Je suis <b>candidat</b>.</p>';
    expect(normalizeForMatch(htmlToText(html))).toBe('Je suis candidat .');
  });
  it('decodes common entities', () => {
    expect(htmlToText('l&rsquo;&eacute;lection&nbsp;2027 &amp; &#233;t&#xe9;')).toBe('l’élection 2027 & été');
  });
});

describe('containsQuote', () => {
  const page = htmlToText('<p>Voilà le sens de ma candidature :&nbsp;rendre aux Français le pouvoir de décider.</p>');
  it('finds a quote word for word', () => expect(containsQuote(page, 'rendre aux Français le pouvoir de décider')).toBe(true));
  it('ignores spacing, non-breaking spaces and apostrophe style', () => {
    expect(containsQuote(htmlToText('<p>C&rsquo;est   le sens\n de ma candidature.</p>'), "C'est le sens de ma candidature")).toBe(true);
    expect(containsQuote(page, 'sens de ma candidature : rendre')).toBe(true);
  });
  it('is case sensitive and rejects changed wording', () => {
    expect(containsQuote(page, 'RENDRE aux Français')).toBe(false);
    expect(containsQuote(page, 'rendre aux Français le droit de décider')).toBe(false);
  });
  it('rejects an empty quote', () => expect(containsQuote(page, '   ')).toBe(false));
});

describe('collectQuotes', () => {
  it('skips sample candidacies', () => expect(collectQuotes(validContent())).toEqual([]));
  it('collects position and declaration quotes of real candidacies with their pages', () => {
    const c = validContent();
    const cand = c.candidacies[0]!.data as any;
    cand.sample = false;
    cand.positions[0].quote = 'Un mot.';
    cand.positions[0].source_url = 'https://www.janedoe.fr/p';
    cand.declaration = { own: { quote: 'Je suis candidate.', source_url: 'https://www.janedoe.fr/c' } };
    expect(collectQuotes(c).map((q) => [q.path, q.quote, q.url])).toEqual([
      ['positions.0.quote', 'Un mot.', 'https://www.janedoe.fr/p'],
      ['declaration.own.quote', 'Je suis candidate.', 'https://www.janedoe.fr/c'],
    ]);
  });
});

describe('compareBySortName', () => {
  const people = [
    { name: 'Bruno Retailleau', sort_name: 'Retailleau Bruno' },
    { name: 'Jean-Luc Mélenchon', sort_name: 'Mélenchon Jean-Luc' },
    { name: 'Delphine Batho', sort_name: 'Batho Delphine' },
    { name: 'Nicolas Dupont-Aignan', sort_name: 'Dupont-Aignan Nicolas' },
    { name: 'Olivier Becht', sort_name: 'Becht Olivier' },
  ];
  it('sorts by surname, not first name', () => {
    expect([...people].sort(compareBySortName).map((p) => p.name)).toEqual(['Delphine Batho', 'Olivier Becht', 'Nicolas Dupont-Aignan', 'Jean-Luc Mélenchon', 'Bruno Retailleau']);
  });
  it('treats accents sensibly and falls back to the display name', () => {
    expect(compareBySortName({ name: 'Éric Zed', sort_name: 'Zed Éric' }, { name: 'Eve Zee', sort_name: 'Zee Eve' })).toBeLessThan(0);
    expect(compareBySortName({ name: 'Candidate A' }, { name: 'Candidate B' })).toBeLessThan(0);
  });
});
