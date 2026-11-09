/** Reads every YAML file under src/content, shared by validate-content and verify-quotes. */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { collections, type CollectionName } from '../src/content/schemas';
import type { Entry, Issue, Loaded } from '../src/lib/validation';

export const contentDir = fileURLToPath(new URL('../src/content', import.meta.url));

function yamlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((f) => f.isFile() && f.name.endsWith('.yaml'))
    .map((f) => join(f.parentPath, f.name))
    .sort();
}

export function loadContent(): { loaded: Loaded; issues: Issue[] } {
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
  return { loaded, issues };
}
