/** Pure helpers for "The story so far" and candidate history. No Astro imports so they can be unit tested. */
import type { Election } from '../content/schemas';

export interface StoryFact {
  id: 'turnout' | 'families' | 'candidates' | 'runoffs';
  label: string;
  /** At most 2 sentences. */
  text: string;
}

export type ElectionKind = Election['kind'];

/** An election with a known date. Every past election has one (the schema requires it); an upcoming one may not. */
export type DatedElection<E extends Election = Election> = E & { date: string };

/** Keeps the past elections, which always have a date. Throws if one does not, so a bad record cannot slip through. */
export function pastElections<E extends Election>(elections: E[]): DatedElection<E>[] {
  return elections
    .filter((e) => e.status === 'past')
    .map((e) => {
      if (!e.date) throw new Error(`Past election "${e.name}" has no date`);
      return e as DatedElection<E>;
    });
}

/** Plural headings and the label for the result of each election type. Order is the order groups are shown in. */
export const KINDS: { kind: ElectionKind; plural: string; winnerLabel: string; rowLabel: string }[] = [
  { kind: 'presidential', plural: 'presidential elections', winnerLabel: 'Winner', rowLabel: 'Candidate' },
  { kind: 'parliamentary', plural: 'parliamentary elections', winnerLabel: 'Largest party', rowLabel: 'Party or list' },
  { kind: 'senate', plural: 'senate elections', winnerLabel: 'Majority', rowLabel: 'Party' },
];
export const kindInfo = (kind: ElectionKind) => KINDS.find((k) => k.kind === kind)!;

/** Past elections grouped by type in a fixed order (presidential, parliamentary, senate), each group newest first. */
export function groupByKind<E extends DatedElection>(elections: E[]): { kind: ElectionKind; elections: E[] }[] {
  return KINDS.map(({ kind }) => ({ kind, elections: byDateDesc(elections.filter((e) => e.kind === kind)) })).filter((g) => g.elections.length > 0);
}

const year = (e: DatedElection) => e.date.slice(0, 4);
const fmt = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`;

/** Newest first. */
export function byDateDesc<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Three facts computed from the election cards themselves, so each one can be checked against a card below it.
 * The middle fact is the winners' political families when every winner has one, otherwise the number of
 * first-round candidates when every election states it. Families are listed alphabetically, never by size.
 */
export function storyFacts(elections: DatedElection[]): StoryFact[] {
  const past = [...elections].filter((e) => e.status === 'past').sort((a, b) => a.date.localeCompare(b.date));
  if (past.length === 0) return [];

  const firstRound = (e: Election) => e.rounds.find((r) => r.round === 1);
  const oldest = past[0]!;
  const newest = past[past.length - 1]!;
  const t0 = firstRound(oldest)?.turnout;
  const t1 = firstRound(newest)?.turnout;

  const allHaveFamily = past.every((e) => e.winner?.family);
  const counts = new Map<string, number>();
  if (allHaveFamily) for (const e of past) counts.set(e.winner!.family!, (counts.get(e.winner!.family!) ?? 0) + 1);
  const families = [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
  const c0 = firstRound(oldest)?.candidates;
  const c1 = firstRound(newest)?.candidates;
  const allHaveCandidates = past.every((e) => firstRound(e)?.candidates !== undefined);

  const runoffs = past.filter((e) => e.rounds.some((r) => r.round === 2)).length;

  const facts: StoryFact[] = [];
  if (t0 !== undefined && t1 !== undefined) {
    facts.push({ id: 'turnout', label: 'Turnout, first round', text: `${fmt(t0)} in ${year(oldest)}, ${fmt(t1)} in ${year(newest)}.` });
  }
  if (allHaveFamily) {
    facts.push({ id: 'families', label: 'Winners by political family', text: `${families.map(([f, n]) => `${f}: ${n}`).join(', ')}.` });
  } else if (allHaveCandidates && c0 !== undefined && c1 !== undefined) {
    facts.push({ id: 'candidates', label: 'Candidates, first round', text: `${c0} in ${year(oldest)}, ${c1} in ${year(newest)}.` });
  }
  facts.push({ id: 'runoffs', label: 'Decided in a second round', text: `${runoffs} of ${past.length} elections.` });
  return facts;
}

export interface EarlierRun<E extends Election = Election> {
  election: DatedElection<E>;
  round: 1 | 2;
  share: number;
  family?: string;
  won: boolean;
}

/** Earlier runs of a person, newest first, taken from the result lines of past elections. Final round only. */
export function earlierRuns<E extends Election>(person: string, elections: E[]): EarlierRun<E>[] {
  const runs: EarlierRun<E>[] = [];
  for (const election of byDateDesc(pastElections(elections))) {
    // Report the last round the person appeared in.
    const rounds = [...election.rounds].sort((a, b) => b.round - a.round);
    for (const r of rounds) {
      const line = r.results.find((x) => x.person === person);
      if (line) {
        runs.push({ election, round: r.round, share: line.share, family: line.family, won: election.winner?.person === person });
        break;
      }
    }
  }
  return runs;
}
