# Scrutable — PRD v0.2

Nov 4, 2026 · @Amir

## TL;DR

Scrutable ([scrutable.vote](https://scrutable.vote)) is a free web app that takes someone from "no idea who's who" to "I get this election" in about 10 minutes. It explains how the election works, who's running and what each candidate stands for, with a source behind every claim. It also tells the short story of the last five elections: who promised what, who won and what happened next.

v1 covers France's 2027 presidential election (round 1 on 18 April, round 2 on 2 May), in English, with no quiz. The USA and Czechia follow for their 2028 elections on the same engine.

## Problem and target user

If you don't already follow a country's politics, there's no easy way in. Quizzes ask your opinion on policies you've never heard of. News assumes you know the players. Candidate sites are one-sided.

**Target user:** someone who will vote but hasn't followed the country's politics. They don't know how the system works or who's running, and want to understand their options quickly so choosing feels easier.

**Their job:** "Before I vote, help me understand what this election decides, who the real options are and what each would do. Don't tell me who to pick."

**Testing:** every screen is tested with people who match the target user before it ships.

## Landscape and how we're different

Every piece of Scrutable already exists somewhere. What doesn't exist is all of them together. Promise tracking on its own is not new, so it can't be the whole pitch.

| Tool | Country | What it does | Gap for a newcomer |
| --- | --- | --- | --- |
| [Votons](https://votons-2027.fr/faq) | France | Candidate pages, quiz, compare, AI assistant | French only; built around the quiz |
| [Swipe Your President](https://lespepitestech.com/node/34744) | France | Swipe quiz with sourced quotes | French only; quiz-first |
| [Volební kalkulačka](https://www.seznamzpravy.cz/clanek/volebni-kalkulacka-2021-koho-volit-174262) | Czechia | Quiz matching since 2006 | Czech only; no context |
| [iSideWith](https://isidewith.com/elections/2028-presidential-quiz) | USA + others | Quiz, polls, discussion | Busy; quiz-first |
| Promise trackers ([Demagog.cz](https://www.seznamzpravy.cz/clanek/domaci-padesat-nejdulezitejsich-slibu-fialovy-vlady-co-splnila-a-co-porusila-241596), PolitiFact, [RMIT](https://www.rmit.edu.au/news/all-news/2023/may/election-promise-tracker)) | Czechia, USA, Australia | Kept/broken status per government | One government at a time, no election story |

**Where we're different:**

1. **Explain first, no quiz.** Built for someone starting from zero.
2. **One story per country:** past elections, promises and outcomes, then today's candidates, all in one place.
3. **Same structure for every country, in English,** so a second country takes no relearning.
4. **Calm, clean design.** Competitors feel ugly or easy to get lost in, so design is part of the product, not polish.

To be honest about it: the moat is the content quality and the design, not the tech.

## Goals and non-goals

**Goals for v1**

- After 10 minutes, a newcomer can say how the election works, name the main candidates and give one key position for each.
- Every factual claim links to a source and shows when it was last checked.
- Adding a country means adding content, not rewriting code.
- It looks good enough that she shares it without apologising for it.

**Not in v1**

- Quiz or any "who matches you" scoring
- Telling anyone who to vote for, or ranking candidates
- Polls and predictions
- Accounts, or storing anything about users' views
- Languages other than English
- Local or regional elections
- An AI chat assistant (possible later, answering only from our verified data)

## MVP scope: France 2027

v1 is four screens. A newcomer can go through them top to bottom and come out understanding the election.

1. **Overview.** What the president actually controls, how the two rounds work, how candidates qualify (500 sponsor signatures), and how to vote, including from abroad. Key dates: register by 12 March 2027, round 1 on 18 April, round 2 on 2 May. Short cards, with glossary pop-ups for jargon.
2. **Candidates.** A card per candidate: name, party, political family, one line and a status (declared or official), in alphabetical order. Each opens a page with a short background and 5 topics, one plain-English line each. Tapping a line shows the source and the original quote. If they ran before, it links to their past results.
3. **Compare.** Pick one of the 5 topics and see one line per candidate side by side.
4. **The story so far.** The last 5 elections (next section).

About and methodology live in the footer. Every page shows a "last checked" date. Mobile-first.

## The story so far: timeline scope

Show the **last 5 elections of the same type**, about 25 years, not 20 elections. Twenty is too much to read, and for most countries it doesn't exist: France has held 11 direct presidential elections since 1965, and Czechia only 3 since direct election began in 2013.

| Country | Elections covered in v1 / next |
| --- | --- |
| France | Presidential 2002, 2007, 2012, 2017, 2022 |
| USA | Presidential 2008–2024 (5) |
| Czechia | Presidential 2013, 2018, 2023 (all direct elections so far) |

**Each election is one card, readable in about 30 seconds:**

- Date, turnout, and the top results (round 1 and round 2 where there is one)
- The winner and their political family
- The winner's **3 headline promises**, each with an outcome: kept, partly kept, broken, blocked or unclear, plus a source
- One line on what defined the term (a crisis, a major reform), with a source

**Above the cards, one strip with three facts:** for example, turnout then vs now, how many winners came from each political family, and who reached the run-off. No dashboard of charts.

**Link it to today.** When a current candidate ran before, their old cards link to their candidate page and the other way round. The history then explains the present instead of sitting there like a museum.

**Rules that keep it fair:**

- Promises are picked by a fixed rule, not by taste: the headline pledges from the winner's own manifesto summary, or the ones an established tracker selected.
- Outcomes come from named trackers or fact-checkers where they exist (PolitiFact, Demagog.cz, Le Monde, iFRAP's Macronomètre). We never rate a promise without a source.
- Promises are judged on verifiable outcomes, not on intent.

This is the most politically sensitive feature, so it gets the strictest review.

## Neutrality principles

The product only works if people from every side trust it. These rules are fixed before any content is written.

- **Same template for everyone:** same topics, same number of positions, same card layout.
- **Neutral order:** alphabetical by default, never by polls or by our judgement of who matters.
- **Everyone who qualifies is included,** not just the front-runners. Minor candidates get the same page, even if it's shorter because less is known.
- **Plain words, no adjectives:** no "radical", "tough" or "bold". Describe what they'd do, not how it sounds.
- **Gaps stay visible:** "No clear position found as of \<date>", never a guess.
- **No polls, no predictions, no scores.**
- **AI drafts, humans verify,** and the methodology page says so.
- **Two-person rule:** nothing goes live without a second reviewer.
- **Public corrections:** anyone, including campaign teams, can flag an error with a source. Corrections are logged publicly.
- **Who runs it and how it's funded** is stated on the About page.

## Keeping it up to date

"Every information updated" is the hardest promise in this PRD, and it's mostly people time, not code. The plan is to automate the finding and keep humans on the deciding.

- **Weekly update agent:** a scheduled GitHub Action runs a script that uses Claude with web search. It checks each candidate for new declarations, withdrawals and changed positions, then opens a pull request with the proposed changes and their sources. A human reviews and merges.
- **Key-date updates by hand, same day:** the official candidate list, major debates, round 1 and round 2 results.
- **Staleness check in CI:** during the campaign, any record not checked for 30+ days raises a warning in the build.
- **Visible freshness:** every page shows its "last checked" date.
- **Corrections inbox:** the report-a-mistake form creates a GitHub issue with a label, and has a target response time.

The field keeps moving until the official list is published. The data tracks declared, official and withdrawn candidates; the site shows only declared and official ones.

## Architecture overview

Scrutable is a static site built from a content repo: no database, no accounts, nothing stored about readers.

&#91;embedded content: Scrutable architecture · publish path and update loop\]

The top row is how content reaches readers. The bottom row is how it changes: the agent proposes, a person decides, and only merged content gets published.

**Stack**

- Astro + TypeScript, with content collections validated by Zod schemas
- Tailwind CSS; React islands only where interaction is needed (topic filter, timeline)
- Charts as lightweight SVG (hand-rolled or Observable Plot)
- Static search with Pagefind
- Cloudflare Pages hosting; cookie-free analytics (Plausible or Umami)
- Update agent: a Node script calling the Claude API with web search, run by GitHub Actions
- A new country = a `content/<country>/` folder, plus an explainer component only if its system needs one (e.g. the US Electoral College)

**Content model**

Country → Election → Candidacy (a person in one election) → Position (candidacy × topic) and Promise (past winners only). Every Position, Promise and timeline Event carries a source URL, a source date and a last-checked date.

Sources in order of preference: official (manifestos, electoral bodies), then established media and fact-checkers, then the candidate's own verified accounts for their own words. Never anonymous sites or AI output.

## Success metrics

Three checks decide whether v1 works:

- **Understanding:** after 10 minutes, 4 of 5 newcomers can explain the two-round system and give one position each for 3 candidates.
- **Accuracy:** zero claims without a source, enforced in CI.
- **Freshness:** every record checked in the last 30 days during the campaign.

## Milestones

Ship a private beta to persona-matching testers by mid-January and go public in early February, before the campaign heats up.

&#91;embedded content: Scrutable milestones · Nov 2026 to Dec 2027\]

**Done when**

1. **Setup:** repo created; PRD, architecture and data-schema docs in `docs/`; CLAUDE.md written; CI running.
2. **Core site:** home, how-it-works and candidate pages for every declared candidate, and persona-matching testers have used them on their phones.
3. **Topics + history:** topics view, the 2002–2022 election cards and the methodology page are live.
4. **Soft launch:** 4 of 5 newcomers pass the hallway test.
5. **Campaign:** the weekly update agent is running, and the official candidate list goes in as soon as it's published.
6. **Next countries:** the USA and Czechia packs are ready, reusing the same engine.

## Open questions

- [ ] Name is Scrutable: buy scrutable.vote (check the renewal price) and scrutable.eu as a redirect.
- [ ] Candidate photos: Wikimedia Commons images with credited licences, or no photos at all?
- [ ] Which 5 topics for France?
- [ ] Who is the second reviewer for the two-person rule?
- [ ] Do French rules on election-period publishing affect us, even without polls? Check before public launch.
- [ ] France's legislative elections may follow the presidential one. Add them to scope, or leave for later?
- [ ] Hosting and API costs if traffic spikes near round 1: who pays, and is there a cap?

## Sources

- [2027 French presidential election — Wikipedia](https://en.wikipedia.org/wiki/2027_French_presidential_election)
- [Votons — FAQ](https://votons-2027.fr/faq)
- [Swipe Your President — Les Pépites Tech](https://lespepitestech.com/node/34744)
- [Boussole présidentielle — ECPR](https://ecpr.eu/Events/Event/PaperDetails/4285)
- [Elyze: The Tinder of Politics](https://digitalpoliticsmanmet.bloggi.co/elyze-the-tinder-of-politics)
- [Volební kalkulačka — Seznam Zprávy](https://www.seznamzpravy.cz/clanek/volebni-kalkulacka-2021-koho-volit-174262)
- [Demagog.cz analysis of 50 government promises — Seznam Zprávy](https://www.seznamzpravy.cz/clanek/domaci-padesat-nejdulezitejsich-slibu-fialovy-vlady-co-splnila-a-co-porusila-241596)
- [iSideWith 2028 presidential quiz](https://isidewith.com/elections/2028-presidential-quiz)
- [RMIT Election Promise Tracker](https://www.rmit.edu.au/news/all-news/2023/may/election-promise-tracker)
- [Polimeter — McMaster University](https://news.mcmaster.ca/?p=31689)
- [Macronomètre — Fondation iFRAP](https://www.ifrap.org/etat-et-collectivites/emmanuel-macron-la-note-du-macronometre-apres-2-ans-de-mandat)
- [2026 Czech municipal elections — Wikipedia](https://en.wikipedia.org/wiki/2026_Czech_municipal_elections)
