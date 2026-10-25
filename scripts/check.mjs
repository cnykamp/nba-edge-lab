import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const files = ['server.mjs'];
for (const directory of ['public', 'src', 'scripts']) {
  for (const file of await readdir(new URL(`../${directory}/`, import.meta.url))) {
    if (file.endsWith('.mjs')) files.push(`${directory}/${file}`);
  }
}
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`Syntax checked ${files.length} modules.`);
