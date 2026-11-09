/** Content access for pages. Everything is read at build time from src/content. */
import { getCollection } from 'astro:content';
import type { Candidacy, Country, Election, Person, Topic } from '../content/schemas';
import { oldestChecked } from './sources';

export interface Candidate {
  slug: string;
  person: Person;
  candidacy: Candidacy & { profile: NonNullable<Candidacy['profile']> };
}

export async function getCountries() {
  return (await getCollection('countries')).map((c) => ({ slug: c.id, ...c.data })).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCountry(slug: string): Promise<Country & { slug: string }> {
  const country = (await getCollection('countries')).find((c) => c.id === slug);
  if (!country) throw new Error(`Unknown country "${slug}"`);
  return { slug, ...country.data };
}

export async function getElections(country: string): Promise<(Election & { slug: string })[]> {
  return (await getCollection('elections'))
    .filter((e) => e.data.country === country)
    .map((e) => ({ slug: e.id, ...e.data }));
}

export async function getUpcomingElection(country: string) {
  const election = (await getElections(country)).find((e) => e.status === 'upcoming');
  if (!election) throw new Error(`No upcoming election for "${country}"`);
  return election;
}

export async function getTopics(country: string): Promise<(Topic & { slug: string })[]> {
  return (await getCollection('topics'))
    .filter((t) => t.data.country === country)
    .map((t) => ({ slug: t.id.split('/').pop() as string, ...t.data }))
    .sort((a, b) => a.order - b.order);
}

/** Declared and official candidates only, alphabetical by name (never by polls or importance). */
export async function getCandidates(electionSlug: string): Promise<Candidate[]> {
  const [candidacies, people] = await Promise.all([getCollection('candidacies'), getCollection('people')]);
  const byId = new Map(people.map((p) => [p.id, p.data]));
  return candidacies
    .filter((c) => c.data.election === electionSlug && c.data.status !== 'withdrawn')
    .map((c) => {
      // validate:content already enforces this; the check keeps the types honest.
      if (!c.data.profile) throw new Error(`Candidacy ${c.id} has no profile`);
      return { slug: c.data.person, person: byId.get(c.data.person)!, candidacy: { ...c.data, profile: c.data.profile } };
    })
    .sort((a, b) => a.person.name.localeCompare(b.person.name, 'en'));
}

export async function getWinnerCandidacy(electionSlug: string, person: string): Promise<Candidacy | undefined> {
  return (await getCollection('candidacies')).find((c) => c.id === `${electionSlug}/${person}`)?.data;
}

/** The oldest last_checked date across all content: shown on pages that carry no facts of their own. */
export async function siteLastChecked(): Promise<string | undefined> {
  const all = await Promise.all(
    (['countries', 'elections', 'candidacies'] as const).map(async (name) => (await getCollection(name)).map((e) => e.data)),
  );
  return oldestChecked(...all.flat());
}

/** People who have a photo, alphabetical: used for the photo credits on the About page. */
export async function getPhotoCredits() {
  return (await getCollection('people'))
    .filter((p) => p.data.photo)
    .map((p) => ({ slug: p.id, name: p.data.name, photo: p.data.photo! }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

/** True while any country, election or person is still sample data: the sample banner shows on every page until then. */
export async function siteHasSample(): Promise<boolean> {
  const [countries, elections, people] = await Promise.all([getCollection('countries'), getCollection('elections'), getCollection('people')]);
  return [...countries, ...elections, ...people].some((e) => e.data.sample);
}
