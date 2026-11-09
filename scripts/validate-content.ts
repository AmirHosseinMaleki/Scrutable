/**
 * pnpm validate:content
 * Fails (exit 1) on schema errors, missing sources and broken references.
 * Warns when a fact was last checked more than 30 days ago.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { todayIso } from '../src/lib/dates';
import { validateContent } from '../src/lib/validation';
import { loadContent } from './load-content';

const { loaded, issues } = loadContent();
const publicPeople = fileURLToPath(new URL('../public/people', import.meta.url));
issues.push(...validateContent(loaded, process.env.VALIDATE_TODAY ?? todayIso(), { photoExists: (f) => existsSync(join(publicPeople, f)) }));

const errors = issues.filter((i) => i.level === 'error');
const warnings = issues.filter((i) => i.level === 'warning');
for (const i of [...errors, ...warnings]) console.log(`${i.level === 'error' ? 'ERROR  ' : 'warning'} ${i.file}: ${i.message}`);

const total = Object.values(loaded).reduce((n, list) => n + list.length, 0);
console.log(`\nChecked ${total} content files: ${errors.length} error(s), ${warnings.length} warning(s).`);
process.exit(errors.length > 0 ? 1 : 0);
