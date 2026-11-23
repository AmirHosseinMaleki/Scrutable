import { z } from 'astro/zod';

/**
 * Content model (docs/PRD.md, "Content model"):
 *   Country → Election → Candidacy (a person in one election)
 *     → Position (candidacy × topic) and Promise (past winners only).
 * Every Position, Promise, result and event carries source_url, source_date and last_checked.
 *
 * Dates are ISO strings (YYYY-MM-DD) and must be quoted in YAML, otherwise the YAML
 * parser turns them into Date objects and validation fails with a clear error.
 */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a quoted ISO date: "YYYY-MM-DD"')
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
  }, 'Not a real calendar date');

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a lowercase-kebab-case slug');

/** Counts sentences loosely: ends of sentences are ., ! or ? followed by space or end. */
export function countSentences(text: string): number {
  const matches = text.trim().match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g);
  return matches ? matches.length : 0;
}

/** A card text is at most 2 sentences (CLAUDE.md, Design). */
const cardText = z
  .string()
  .min(1)
  .refine((s) => countSentences(s) <= 2, 'Card text must be at most 2 sentences');

/** The three fields every fact carries. */
export const sourceFields = {
  source_url: z.url({ protocol: /^https?$/ }),
  /** The most recent date the page prints for its content (published, updated or verified). */
  source_date: isoDate,
  last_checked: isoDate,
  /** True when the page prints no date: source_date is then the date we read it, and must equal last_checked. */
  source_date_is_retrieval: z.boolean().optional(),
};

// --- Country ---------------------------------------------------------------

const explainerCard = z.strictObject({
  title: z.string().min(1),
  summary: cardText,
  detail: z.string().min(1).optional(),
  ...sourceFields,
});

export const countrySchema = z.strictObject({
  name: z.string().min(1),
  sample: z.boolean().default(false),
  /** Short intro shown on the home page and overview. */
  intro: cardText,
  /** "How it works": what the office controls, rounds, qualifying. */
  how_it_works: z.array(explainerCard).min(1),
  /** "How to vote": ordered steps. */
  how_to_vote: z.array(explainerCard).min(1),
});

// --- Election --------------------------------------------------------------

const resultLine = z.strictObject({
  /** Display name as published in the source. */
  name: z.string().min(1),
  /** Slug of a person entry, when that person also appears elsewhere on the site. */
  person: slug.optional(),
  /** Political family. Optional: only given when a reachable, citable source states it. */
  family: z.string().min(1).optional(),
  /** Percentage of valid votes, 0–100. */
  share: z.number().min(0).max(100),
  /** Seats won, for parliamentary and senate elections. */
  seats: z.number().int().min(0).optional(),
  /** Electoral College votes, for US presidential elections. */
  electoral_votes: z.number().int().min(0).optional(),
});

const round = z.strictObject({
  round: z.union([z.literal(1), z.literal(2)]),
  date: isoDate,
  /** Turnout percentage, 0–100. Required for presidential elections; leave it out when no single figure exists. */
  turnout: z.number().min(0).max(100).optional(),
  /** Total seats at stake, for parliamentary and senate elections. */
  seats_total: z.number().int().min(1).optional(),
  /** Number of candidates on the ballot in this round, when the source states it. */
  candidates: z.number().int().min(2).optional(),
  results: z.array(resultLine).min(1),
  ...sourceFields,
});

const keyDate = z.strictObject({
  label: z.string().min(1),
  date: isoDate,
  ...sourceFields,
});

/**
 * Facts about the term that followed a past election: the same three for every term, each taken from an official
 * record and each either found (with its source) or an explicit gap. There is no editorial "what defined the term" line.
 */
const termGap = z.strictObject({ status: z.literal('not_found'), checked_on: isoDate });
/** A found fact has one main source and, when one page is not enough, extra sources (each with its own date and check). */
const termFact = <T extends z.ZodRawShape>(shape: T) =>
  z.discriminatedUnion('status', [
    z.strictObject({ status: z.literal('found'), ...shape, ...sourceFields, also_sources: z.array(z.strictObject(sourceFields)).default([]) }),
    termGap,
  ]);

const termFacts = z.strictObject({
  /** True when the term is still running: the card then says "so far". */
  ongoing: z.boolean().default(false),
  /** Prime ministers who served during the term, in order. */
  prime_ministers: termFact({ names: z.array(z.string().min(1)).min(1) }),
  /** Referendums held during the term. An empty list means none were held (the source still has to say so). */
  referendums: termFact({ held: z.array(z.strictObject({ date: isoDate, subject: z.string().min(1) })) }),
  /** Dates on which the National Assembly was dissolved during the term. An empty list means no dissolution. */
  dissolutions: termFact({ dates: z.array(isoDate) }),
});

/**
 * Term facts for countries whose terms do not look like France's: a list of labelled facts, each found (with its
 * source) or an explicit gap. An empty `items` list means "none" and still needs a source.
 */
const termListItem = z.discriminatedUnion('status', [
  z.strictObject({
    status: z.literal('found'),
    label: z.string().min(1),
    items: z.array(z.string().min(1)),
    ...sourceFields,
    also_sources: z.array(z.strictObject(sourceFields)).default([]),
  }),
  z.strictObject({ status: z.literal('not_found'), label: z.string().min(1), checked_on: isoDate }),
]);

/**
 * A candidate who has declared but has no page of their own yet. Listed (alphabetically) so the Candidates
 * page does not look like the whole field. Needs two established outlets that both report the declaration.
 */
const alsoDeclared = z.strictObject({
  name: z.string().min(1),
  /** Surname first, for alphabetical order. */
  sort_name: z.string().min(1),
  party: z.string().min(1).optional(),
  sample: z.boolean().default(false),
  sources: z
    .array(z.strictObject({ outlet: z.string().min(1), ...sourceFields }))
    .min(2, 'Two established outlets are needed to list someone as declared'),
  /** Optional neutral note with its own source, e.g. a pending legal ruling that affects the candidacy. */
  note: z.strictObject({ text: cardText, ...sourceFields }).optional(),
});

export const electionSchema = z
  .strictObject({
    country: slug,
    /** The type of election. Presidential unless stated. */
    kind: z.enum(['presidential', 'parliamentary', 'senate']).default('presidential'),
    name: z.string().min(1),
    status: z.enum(['upcoming', 'past']),
    sample: z.boolean().default(false),
    /** Required for past elections. An upcoming election may have none while the date is unannounced. */
    date: isoDate.optional(),
    /** Upcoming elections: dates readers need (register, round 1, round 2). */
    key_dates: z.array(keyDate).default([]),
    /** Upcoming elections: declared candidates who do not have a page yet. */
    also_declared: z.array(alsoDeclared).default([]),
    /** Past elections: results per round. */
    rounds: z.array(round).default([]),
    winner: z.strictObject({ name: z.string().min(1), person: slug.optional(), family: z.string().min(1).optional() }).optional(),
    /** Past elections: what happened during the term that followed (prime ministers, referendums, dissolutions). */
    term: termFacts.optional(),
    /** Past elections outside France: other labelled facts about the term (see termListItem). */
    term_facts: z.array(termListItem).optional(),
  })
  .superRefine((e, ctx) => {
    if (e.status === 'past') {
      if (!e.date) ctx.addIssue({ code: 'custom', path: ['date'], message: 'Past elections need a date' });
      if (e.rounds.length === 0) ctx.addIssue({ code: 'custom', path: ['rounds'], message: 'Past elections need at least one round of results' });
      if (!e.winner) ctx.addIssue({ code: 'custom', path: ['winner'], message: 'Past elections need a winner' });
      if (e.country === 'fr' && !e.term) ctx.addIssue({ code: 'custom', path: ['term'], message: 'Past elections need a term block' });
      if (e.country !== 'fr' && !e.term && !e.term_facts) ctx.addIssue({ code: 'custom', path: ['term_facts'], message: 'Past elections need term_facts (or a term block)' });
    } else if (e.key_dates.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['key_dates'], message: 'Upcoming elections need key_dates' });
    }
  });

// --- Person ----------------------------------------------------------------

/**
 * A portrait stored in public/people/ (never hotlinked: no third-party requests, no trackers).
 * source_url is the file's page (Wikimedia Commons for real people); the licence and author are
 * shown to readers as credit.
 */
export const photoSchema = z.strictObject({
  file: z.string().regex(/^[a-z0-9][a-z0-9-]*\.(jpg|webp|png|svg)$/, 'Use a lowercase file name in public/people/'),
  author: z.string().min(1),
  /** SPDX-style id. Only licences that allow reuse with credit are accepted. */
  license: z.string().regex(/^(CC0-1\.0|PDM-1\.0|CC-BY-[1-4]\.0|CC-BY-SA-[1-4]\.0)$/, 'Licence must be CC0, public domain mark, CC BY or CC BY-SA'),
  license_url: z.url({ protocol: /^https?$/ }),
  /** Year the photo was taken, shown in the credit so readers can see how old it is. */
  taken_year: z.number().int().min(1900).max(2100).optional(),
  ...sourceFields,
});

export const personSchema = z.strictObject({
  name: z.string().min(1),
  /** Surname first, e.g. "Mélenchon Jean-Luc": lists are sorted by it. Required for real people. */
  sort_name: z.string().min(1).optional(),
  sample: z.boolean().default(false),
  /** Optional. Without one the site shows a neutral initials avatar. */
  photo: photoSchema.optional(),
});

// --- Topic -----------------------------------------------------------------

export const topicSchema = z.strictObject({
  country: slug,
  name: z.string().min(1),
  /** Neutral one-line explanation of what the topic covers. */
  description: cardText,
  order: z.number().int().min(1),
  sample: z.boolean().default(false),
});

// --- Candidacy (positions + promises) -------------------------------------

/**
 * A position is either found (with a source) or an explicit gap.
 * A gap carries no claim, only the date we looked: "No clear position found as of <date>".
 */
const positionFound = z.strictObject({
  topic: slug,
  status: z.literal('found'),
  summary: cardText,
  /** The candidate's own words, copied exactly from the source, in the language of the source. Leave out if there is none. */
  quote: z.string().min(1).optional(),
  /** Language of the quote (ISO 639-1, e.g. "fr"). Required with a quote. */
  quote_lang: z.string().regex(/^[a-z]{2}$/, 'Use a two-letter language code such as "fr"').optional(),
  ...sourceFields,
}).refine((p) => !p.quote || p.quote_lang, { path: ['quote_lang'], message: 'quote_lang is required when a quote is given' });
const positionGap = z.strictObject({ topic: slug, status: z.literal('not_found'), checked_on: isoDate });
export const positionSchema = z.discriminatedUnion('status', [positionFound, positionGap]);

export const promiseOutcome = z.enum(['kept', 'partly_kept', 'broken', 'blocked', 'unclear']);

const promiseFound = z.strictObject({
  status: z.literal('found'),
  text: cardText,
  outcome: promiseOutcome,
  /** Named tracker or fact-checker that rated the outcome. We never rate without one. */
  rated_by: z.string().min(1),
  ...sourceFields,
});
const promiseGap = z.strictObject({ status: z.literal('not_found'), checked_on: isoDate });
export const promiseSchema = z.discriminatedUnion('status', [promiseFound, promiseGap]);

export const candidacySchema = z.strictObject({
  election: slug,
  person: slug,
  sample: z.boolean().default(false),
  /** declared and official are shown on the site; withdrawn is kept in the data only. */
  status: z.enum(['declared', 'official', 'withdrawn']),
  /**
   * How the candidacy was declared: the candidate's own words on their own page (verbatim, in the language of the
   * page) and one established news source. Required for real candidates in an upcoming election.
   */
  declaration: z
    .strictObject({
      /** Date of the declaration (ISO). Left out when no source states it. */
      date: isoDate.optional(),
      own: z.strictObject({ quote: z.string().min(1), quote_lang: z.string().regex(/^[a-z]{2}$/), ...sourceFields }),
      news: z.strictObject({ outlet: z.string().min(1), ...sourceFields }),
    })
    .optional(),
  /** Required for candidates in an upcoming election; past winners only need their promises. */
  profile: z.strictObject({
    party: z.string().min(1),
    /** Political family. Optional: only given when the candidate's or party's own page states its own label. */
    family: z.string().min(1).optional(),
    one_line: cardText,
    background: z.string().min(1),
    ...sourceFields,
  }).optional(),
  positions: z.array(positionSchema).default([]),
  /** Past winners only: the 3 headline promises. */
  promises: z.array(promiseSchema).default([]),
});

// --- Collections table, shared by Astro and scripts/validate-content.ts ---------------

export const collections = {
  countries: { dir: 'countries', schema: countrySchema },
  elections: { dir: 'elections', schema: electionSchema },
  people: { dir: 'people', schema: personSchema },
  candidacies: { dir: 'candidacies', schema: candidacySchema },
  topics: { dir: 'topics', schema: topicSchema },
} as const;

export type CollectionName = keyof typeof collections;
export type Country = z.infer<typeof countrySchema>;
export type Election = z.infer<typeof electionSchema>;
export type Person = z.infer<typeof personSchema>;
export type Topic = z.infer<typeof topicSchema>;
export type Candidacy = z.infer<typeof candidacySchema>;
export type AlsoDeclared = z.infer<typeof alsoDeclared>;
export type Position = z.infer<typeof positionSchema>;
export type Promise_ = z.infer<typeof promiseSchema>;
export type PromiseOutcome = z.infer<typeof promiseOutcome>;
