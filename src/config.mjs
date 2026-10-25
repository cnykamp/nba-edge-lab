import { readFile, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const KEY_NAMES = ['BALLDONTLIE_API_KEY', 'ODDS_API_KEY'];
export function parseKeys(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const match = line.match(/^([A-Z_]+)=([A-Za-z0-9._-]*)$/);
    if (!match || !KEY_NAMES.includes(match[1]) || Object.hasOwn(values, match[1])) {
      throw new Error('Invalid local key file. Use npm run setup:keys.');
    }
    values[match[1]] = match[2];
  }
  return values;
}
export async function readKeys(root = ROOT, environment = process.env) {
  let fromFile = {};
  const path = join(root, '.env');
  try {
    const stat = await lstat(path);
    if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077)) {
      throw new Error('The local key file must be a regular file with owner-only permissions (chmod 600 .env).');
    }
    fromFile = parseKeys(await readFile(path, 'utf8'));
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  return Object.fromEntries(KEY_NAMES.map(name => [name, environment[name] || fromFile[name] || '']));
}
