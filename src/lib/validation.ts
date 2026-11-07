import { collections, type CollectionName } from '../content/schemas';
import { collectFacts, collectStrings } from './sources';
import { daysBetween, STALE_AFTER_DAYS } from './dates';

export interface Issue {
  level: 'error' | 'warning';
  file: string;
  message: string;
}

export interface Entry {
  /** Path relative to src/content, e.g. "people/candidate-a.yaml". */
  file: string;
  /** Id without extension, e.g. "fr-presidential-2027/candidate-a". */
  id: string;
  data: unknown;
}

export type Loaded = Record<CollectionName, Entry[]>;

/** Wording that CLAUDE.md bans (neutrality rules). Matched as whole words, case-insensitive. */
export const BANNED_WORDS = ['radical', 'bold', 'extreme', 'tough'];

/** Past elections carry exactly this many headline promise slots for the winner. */
export const PROMISES_PER_WINNER = 3;

const SOURCE_FIELDS = ['source_url', 'source_date', 'last_checked'];
const PLACEHOLDER_HOSTS = ['example.com', 'example.org', 'example.net'];
const PLACEHOLDER_NAME = /^(candidate [a-z]|sample\b)/i;

// Parsed data is validated by Zod first; the cross-checks below only run on entries that passed.
type Parsed = { entry: Entry; data: any };

export interface Options {
  /** Does public/people/<file> exist? Skipped when not given (unit tests). */
  photoExists?: (file: string) => boolean;
}

export function validateContent(content: Loaded, today: string, options: Options = {}): Issue[] {
  const issues: Issue[] = [];
  const add = (level: Issue['level'], file: string, message: string) => issues.push({ level, file, message });

  // 1. Schemas -----------------------------------------------------------------------------
  const ok: Record<CollectionName, Parsed[]> = { countries: [], elections: [], people: [], candidacies: [], topics: [] };
  for (const name of Object.keys(collections) as CollectionName[]) {
    for (const entry of content[name]) {
      const result = collections[name].schema.safeParse(entry.data);
      if (result.success) {
        ok[name].push({ entry, data: result.data });
        continue;
      }
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        const last = String(issue.path[issue.path.length - 1] ?? '');
        const msg = SOURCE_FIELDS.includes(last)
          ? `${path}: missing or invalid ${last} (every fact needs source_url, source_date and last_checked)`
          : `${path || '(root)'}: ${issue.message}`;
        add('error', entry.file, msg);
      }
    }
  }

  // 2. Sources and freshness on every fact ---------------------------------------------------
  for (const name of Object.keys(collections) as CollectionName[]) {
    for (const { entry, data } of ok[name]) {
      const isSample = Boolean(data.sample);
      let stalest: { date: string; age: number } | undefined;
      let stale = 0;
      for (const f of collectFacts(data)) {
        const where = f.path || '(root)';
        if (f.source_url !== undefined) {
          const host = new URL(String(f.source_url)).hostname;
          const placeholder = PLACEHOLDER_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
          if (placeholder && !isSample) add('error', entry.file, `${where}: placeholder source (${host}) on content that is not marked sample: true`);
        }
        const sd = typeof f.source_date === 'string' ? f.source_date : undefined;
        const lc = typeof f.last_checked === 'string' ? f.last_checked : undefined;
        const checked = lc ?? (typeof f.checked_on === 'string' ? f.checked_on : undefined);
        if (sd && sd > today) add('error', entry.file, `${where}: source_date ${sd} is in the future`);
        if (checked && checked > today) add('error', entry.file, `${where}: last_checked ${checked} is in the future`);
        if (sd && lc && lc < sd) add('error', entry.file, `${where}: last_checked ${lc} is before source_date ${sd}`);
        if (checked) {
          const age = daysBetween(checked, today);
          if (age > STALE_AFTER_DAYS) {
            stale += 1;
            if (!stalest || age > stalest.age) stalest = { date: checked, age };
          }
        }
      }
      if (stale > 0 && stalest) {
        add('warning', entry.file, `${stale} fact(s) not checked for more than ${STALE_AFTER_DAYS} days (oldest: ${stalest.date}, ${stalest.age} days ago)`);
      }
    }
  }

  // 3. Wording rules ------------------------------------------------------------------------
  const banned = new RegExp(`\\b(${BANNED_WORDS.join('|')})\\b`, 'i');
  for (const name of Object.keys(collections) as CollectionName[]) {
    for (const { entry, data } of ok[name]) {
      for (const s of collectStrings(data)) {
        // A candidate's own words are quoted as published; everything else is our wording.
        if (s.key === 'quote' || s.key === 'source_url') continue;
        const m = s.value.match(banned);
        if (m) add('error', entry.file, `"${m[0]}" is not allowed in our wording (neutral language only)`);
      }
    }
  }

  // 4. Cross references and neutrality -----------------------------------------------------
  const countries = new Map(ok.countries.map((c) => [c.entry.id, c]));
  const elections = new Map(ok.elections.map((e) => [e.entry.id, e]));
  const people = new Map(ok.people.map((p) => [p.entry.id, p]));

  for (const { entry, data } of ok.people) {
    if (!data.sample && PLACEHOLDER_NAME.test(data.name)) add('error', entry.file, `"${data.name}" looks like a placeholder name but is not marked sample: true`);
    if (data.photo) {
      const { file, source_url } = data.photo as { file: string; source_url: string };
      if (options.photoExists && !options.photoExists(file)) add('error', entry.file, `photo.file "${file}" is not in public/people/`);
      if (!data.sample) {
        if (new URL(source_url).hostname !== 'commons.wikimedia.org') add('error', entry.file, 'photo.source_url must be the file page on commons.wikimedia.org');
        if (file.endsWith('.svg')) add('error', entry.file, 'photo.file must be a photograph (jpg, webp or png), not an svg');
      }
    }
  }

  for (const { entry, data } of ok.topics) {
    if (!countries.has(data.country)) add('error', entry.file, `country "${data.country}" does not exist`);
    if (!entry.id.startsWith(`${data.country}/`)) add('error', entry.file, `topics must live in topics/${data.country}/`);
  }

  const upcomingPerCountry = new Map<string, number>();
  for (const { entry, data } of ok.elections) {
    if (!countries.has(data.country)) add('error', entry.file, `country "${data.country}" does not exist`);
    if (data.status === 'upcoming') upcomingPerCountry.set(data.country, (upcomingPerCountry.get(data.country) ?? 0) + 1);

    for (const r of data.rounds as { round: number; results: { name: string; person?: string; share: number }[] }[]) {
      const total = r.results.reduce((sum, x) => sum + x.share, 0);
      if (total > 100.0001) add('error', entry.file, `round ${r.round}: shares add up to ${total.toFixed(1)}% (more than 100%)`);
      for (const x of r.results) {
        if (x.person && !people.has(x.person)) add('error', entry.file, `round ${r.round}: person "${x.person}" does not exist`);
      }
    }
    if (data.winner) {
      if (data.winner.person && !people.has(data.winner.person)) add('error', entry.file, `winner.person "${data.winner.person}" does not exist`);
      if (data.status === 'past' && !data.winner.person) add('error', entry.file, 'winner.person is required so the 3 headline promises can be attached to a candidacy');
      const last = data.rounds.at(-1);
      const top = last ? [...last.results].sort((a: { share: number }, b: { share: number }) => b.share - a.share)[0] : undefined;
      if (top && top.name !== data.winner.name) add('error', entry.file, `winner "${data.winner.name}" is not first in the final round (first: "${top.name}")`);
    }
  }
  for (const [country, n] of upcomingPerCountry) {
    if (n > 1) add('error', `countries/${country}.yaml`, `${n} upcoming elections found; the site expects one`);
  }

  const topicsByCountry = new Map<string, string[]>();
  for (const { entry, data } of ok.topics) {
    const slug = entry.id.split('/').pop() as string;
    topicsByCountry.set(data.country, [...(topicsByCountry.get(data.country) ?? []), slug]);
  }

  const seen = new Set<string>();
  for (const { entry, data } of ok.candidacies) {
    const expectedId = `${data.election}/${data.person}`;
    if (entry.id !== expectedId) add('error', entry.file, `file must be candidacies/${expectedId}.yaml (election and person fields decide the path)`);
    if (seen.has(expectedId)) add('error', entry.file, 'duplicate candidacy');
    seen.add(expectedId);

    const election = elections.get(data.election);
    const person = people.get(data.person);
    if (!election) add('error', entry.file, `election "${data.election}" does not exist`);
    if (!person) add('error', entry.file, `person "${data.person}" does not exist`);
    if (person && Boolean(person.data.sample) !== Boolean(data.sample)) add('error', entry.file, `sample flag differs from people/${data.person}.yaml`);
    if (!election) continue;

    const slugs = topicsByCountry.get(election.data.country) ?? [];
    const positionTopics = (data.positions as { topic: string }[]).map((p) => p.topic);

    if (election.data.status === 'upcoming') {
      // Same template for everyone: exactly one position (or explicit gap) per topic.
      for (const t of positionTopics) if (!slugs.includes(t)) add('error', entry.file, `position topic "${t}" does not exist for ${election.data.country}`);
      for (const t of slugs) {
        const n = positionTopics.filter((x) => x === t).length;
        if (n !== 1) add('error', entry.file, `topic "${t}" has ${n} positions; every candidate needs exactly one (use status: not_found for a gap)`);
      }
      if (data.promises.length > 0) add('error', entry.file, 'promises belong to past winners only');
    } else {
      if (data.positions.length > 0) add('error', entry.file, 'past candidacies hold promises, not positions');
      const isWinner = election.data.winner?.person === data.person;
      if (!isWinner) add('error', entry.file, 'only the winner of a past election has a candidacy file (with promises)');
      if (isWinner && data.promises.length !== PROMISES_PER_WINNER) {
        add('error', entry.file, `winners have exactly ${PROMISES_PER_WINNER} promise slots (use status: not_found for a gap); found ${data.promises.length}`);
      }
    }
  }

  // Every declared/official/withdrawn candidacy of an upcoming election needs a candidacy file for each winner too.
  for (const { entry, data } of ok.elections) {
    if (data.status === 'past' && data.winner?.person && !seen.has(`${entry.id}/${data.winner.person}`)) {
      add('error', entry.file, `winner "${data.winner.person}" has no candidacy file with promises`);
    }
  }

  return issues;
}
