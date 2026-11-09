import type { Loaded } from '../src/lib/validation';

export const TODAY = '2026-11-06';

const src = { source_url: 'https://example.com/s', source_date: '2026-10-01', last_checked: '2026-11-01' };
const topic = (n: number) => ({ country: 'fr', name: `Topic ${n}`, description: 'A topic.', order: n, sample: true });

/** A minimal, valid content set: one country, 2 topics, 2 candidates, 1 past election. */
export function validContent(): Loaded {
  const found = (t: string) => ({ topic: t, status: 'found', summary: 'A position.', ...src });
  const profile = { party: 'P', family: 'F', one_line: 'A line.', background: 'Background.', ...src };
  const card = { title: 'T', summary: 'S.', ...src };
  return {
    countries: [{ file: 'countries/fr.yaml', id: 'fr', data: { name: 'France', sample: true, intro: 'Intro.', how_it_works: [card], how_to_vote: [card] } }],
    topics: [
      { file: 'topics/fr/t1.yaml', id: 'fr/t1', data: topic(1) },
      { file: 'topics/fr/t2.yaml', id: 'fr/t2', data: topic(2) },
    ],
    people: ['cand-a', 'cand-b', 'win-1'].map((s) => ({ file: `people/${s}.yaml`, id: s, data: { name: s, sample: true } })),
    elections: [
      {
        file: 'elections/up.yaml',
        id: 'up',
        data: { country: 'fr', kind: 'presidential', name: 'Up', status: 'upcoming', sample: true, date: '2027-04-01', key_dates: [{ label: 'x', date: '2027-04-01', ...src }] },
      },
      {
        file: 'elections/past-1.yaml',
        id: 'past-1',
        data: {
          country: 'fr',
          kind: 'presidential',
          name: 'Past 1',
          status: 'past',
          sample: true,
          date: '2020-04-01',
          rounds: [{ round: 1, date: '2020-04-01', turnout: 60, results: [{ name: 'W', person: 'win-1', family: 'F', share: 40 }, { name: 'O', family: 'G', share: 30 }], ...src }],
          winner: { name: 'W', person: 'win-1', family: 'F' },
          defining_event: { status: 'found', text: 'Something happened.', ...src },
        },
      },
    ],
    candidacies: [
      ...['cand-a', 'cand-b'].map((p) => ({
        file: `candidacies/up/${p}.yaml`,
        id: `up/${p}`,
        data: { election: 'up', person: p, sample: true, status: 'declared', profile, positions: [found('t1'), found('t2')] },
      })),
      {
        file: 'candidacies/past-1/win-1.yaml',
        id: 'past-1/win-1',
        data: {
          election: 'past-1',
          person: 'win-1',
          sample: true,
          status: 'official',
          promises: [1, 2, 3].map(() => ({ status: 'found', text: 'A promise.', outcome: 'kept', rated_by: 'Tracker', ...src })),
        },
      },
    ],
  };
}
