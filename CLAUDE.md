# Scrutable

A free web app that explains elections to people who don't follow politics: how the election works, who's running, what they stand for, and what happened in the last 5 elections. Every fact has a source.

v1: France presidential election 2027, English only. The full spec is in `docs/PRD.md`; read it before any feature work.

## Stack

- Astro + TypeScript (strict), static output, no server, no database
- Content collections with Zod schemas (`src/content/config.ts`)
- Tailwind CSS
- React islands only where interaction is needed (Compare, timeline cards)
- pnpm, Vitest, GitHub Actions, Cloudflare Pages

## Commands

- `pnpm dev`: local dev server
- `pnpm build`: production build
- `pnpm check`: `astro check` + type check
- `pnpm test`: unit tests
- `pnpm validate:content`: schema, source and freshness checks on all content

Before saying a task is done, run `pnpm check && pnpm test && pnpm validate:content && pnpm build`.

## Content layout

```
src/content/
  countries/        fr.yaml
  elections/        fr-presidential-2027.yaml, fr-presidential-2022.yaml, ...
  people/           <person-slug>.yaml
  candidacies/      <election-slug>/<person-slug>.yaml   # positions + promises live here
  topics/           fr/<topic-slug>.yaml
```

Adding a country = adding content folders. Code changes only if its system needs a special explainer (e.g. the US Electoral College).

## Content rules (non-negotiable)

- Every position, promise, result and event has `source_url`, `source_date` and `last_checked`. Validation fails without them.
- Never invent facts, quotes, numbers, dates or sources. Unknown means an empty field, and the UI shows "No clear position found as of <date>".
- Until told otherwise, use sample data only: fictional candidates ("Candidate A", "Candidate B"…) marked `sample: true`. Never add real candidate positions without verified sources.
- Real content goes in its own PR, separate from code, with every source listed in the description.

## Neutrality rules

- Same template, same topics and same number of positions for every candidate.
- Candidates are listed alphabetically; never by polls or importance.
- Plain, neutral wording: no "radical", "bold", "extreme", "tough".
- No polls, scores, rankings, quizzes or "who should you vote for".
- No party colours. Candidates get neutral styling only.

## Design

- Calm, clean, modern. Lots of white space, one accent colour, clear type.
- Short text: a card is at most 2 sentences. Details appear on tap or expand.
- Mobile-first: everything must read well at 375px wide.
- Accessible: WCAG AA contrast, keyboard navigation, real headings, alt text.
- Every page shows its "last checked" date.
- No cookies, no trackers, no accounts.

## Working style

- Plan first for anything larger than a small fix; wait for approval before coding.
- Small, focused changes. One milestone step at a time.
- Ask before adding a new dependency.
- Don't edit `docs/PRD.md`. If something conflicts with it, stop and ask.
