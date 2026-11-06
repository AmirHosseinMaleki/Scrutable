/**
 * pnpm validate:content
 * Fails (exit 1) on schema errors, missing sources and broken references.
 * Warns when a fact was last checked more than 30 days ago.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { collections, type CollectionName } from '../src/content/schemas';
import { todayIso } from '../src/lib/dates';
import { validateContent, type Entry, type Issue, type Loaded } from '../src/lib/validation';

const contentDir = fileURLToPath(new URL('../src/content', import.meta.url));

function yamlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((f) => f.isFile() && f.name.endsWith('.yaml'))
    .map((f) => join(f.parentPath, f.name))
    .sort();
}

const issues: Issue[] = [];
const loaded = {} as Loaded;

for (const name of Object.keys(collections) as CollectionName[]) {
  const base = join(contentDir, collections[name].dir);
  loaded[name] = [];
  for (const path of yamlFiles(base)) {
    const file = relative(contentDir, path);
    const id = relative(base, path).replace(/\.yaml$/, '');
    try {
      loaded[name].push({ file, id, data: parse(readFileSync(path, 'utf8')) } satisfies Entry);
    } catch (e) {
      issues.push({ level: 'error', file, message: `YAML parse error: ${(e as Error).message}` });
    }
  }
}

issues.push(...validateContent(loaded, process.env.VALIDATE_TODAY ?? todayIso()));

const errors = issues.filter((i) => i.level === 'error');
const warnings = issues.filter((i) => i.level === 'warning');
for (const i of [...errors, ...warnings]) console.log(`${i.level === 'error' ? 'ERROR  ' : 'warning'} ${i.file}: ${i.message}`);

const total = Object.values(loaded).reduce((n, list) => n + list.length, 0);
console.log(`\nChecked ${total} content files: ${errors.length} error(s), ${warnings.length} warning(s).`);
process.exit(errors.length > 0 ? 1 : 0);
