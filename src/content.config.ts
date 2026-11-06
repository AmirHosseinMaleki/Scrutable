// Astro 5+ reads collections from src/content.config.ts (CLAUDE.md mentions the older
// src/content/config.ts path). The schemas themselves live in src/content/schemas.ts so
// the validate:content script can import the same ones.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { collections as defs } from './content/schemas';

const yaml = (dir: string) => glob({ base: `./src/content/${dir}`, pattern: '**/*.yaml' });

export const collections = {
  countries: defineCollection({ loader: yaml(defs.countries.dir), schema: defs.countries.schema }),
  elections: defineCollection({ loader: yaml(defs.elections.dir), schema: defs.elections.schema }),
  people: defineCollection({ loader: yaml(defs.people.dir), schema: defs.people.schema }),
  candidacies: defineCollection({ loader: yaml(defs.candidacies.dir), schema: defs.candidacies.schema }),
  topics: defineCollection({ loader: yaml(defs.topics.dir), schema: defs.topics.schema }),
};
