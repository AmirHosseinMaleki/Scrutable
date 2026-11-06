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

const oneSentence = z
  .string()
  .min(1)
  .refine((s) => countSentences(s) <= 1, 'Must be one sentence');

/** The three fields every fact carries. */
export const sourceFields = {
  source_url: z.url({ protocol: /^https?$/ }),
  source_date: isoDate,
  last_checked: isoDate,
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
  family: z.string().min(1),
  /** Percentage of valid votes, 0–100. */
  share: z.number().min(0).max(100),
});

const round = z.strictObject({
  round: z.union([z.literal(1), z.literal(2)]),
  date: isoDate,
  /** Turnout percentage, 0–100. */
  turnout: z.number().min(0).max(100),
  results: z.array(resultLine).min(1),
  ...sourceFields,
});

const keyDate = z.strictObject({
  label: z.string().min(1),
  date: isoDate,
  ...sourceFields,
});

export const electionSchema = z
  .strictObject({
    country: slug,
    kind: z.literal('presidential'),
    name: z.string().min(1),
    status: z.enum(['upcoming', 'past']),
    sample: z.boolean().default(false),
    date: isoDate,
    /** Upcoming elections: dates readers need (register, round 1, round 2). */
    key_dates: z.array(keyDate).default([]),
    /** Past elections: results per round. */
    rounds: z.array(round).default([]),
    winner: z.strictObject({ name: z.string().min(1), person: slug.optional(), family: z.string().min(1) }).optional(),
    /** One line on what defined the term (a crisis, a major reform), with a source. */
    defining_event: z.strictObject({ text: oneSentence, ...sourceFields }).optional(),
  })
  .superRefine((e, ctx) => {
    if (e.status === 'past') {
      if (e.rounds.length === 0) ctx.addIssue({ code: 'custom', path: ['rounds'], message: 'Past elections need at least one round of results' });
      if (!e.winner) ctx.addIssue({ code: 'custom', path: ['winner'], message: 'Past elections need a winner' });
      if (!e.defining_event) ctx.addIssue({ code: 'custom', path: ['defining_event'], message: 'Past elections need a defining_event' });
    } else if (e.key_dates.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['key_dates'], message: 'Upcoming elections need key_dates' });
    }
  });

// --- Person ----------------------------------------------------------------

export const personSchema = z.strictObject({
  name: z.string().min(1),
  sample: z.boolean().default(false),
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
  /** The candidate's own words, copied exactly from the source. Leave out if there is none. */
  quote: z.string().min(1).optional(),
  ...sourceFields,
});
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
  profile: z.strictObject({
    party: z.string().min(1),
    family: z.string().min(1),
    one_line: cardText,
    background: z.string().min(1),
    ...sourceFields,
  }),
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
export type Position = z.infer<typeof positionSchema>;
export type Promise_ = z.infer<typeof promiseSchema>;
export type PromiseOutcome = z.infer<typeof promiseOutcome>;
