import { open, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, KEY_NAMES } from '../src/config.mjs';

function hiddenInput(label) {
  return new Promise((resolve, reject) => {
    process.stdout.write(label);
    let text = '';
    process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.setEncoding('utf8');
    function finish(error) {
      process.stdin.removeListener('data', onData);
      process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n');
      if (error) reject(error); else resolve(text);
    }
    function onData(chunk) {
      for (const character of chunk) {
        if (character === '\u0003') return finish(new Error('cancelled'));
        if (character === '\r' || character === '\n') return finish();
        if (character === '\u007f' || character === '\b') text = text.slice(0, -1);
        else if (/^[A-Za-z0-9._-]$/.test(character) && text.length < 512) text += character;
      }
    }
    process.stdin.on('data', onData);
  });
}
try {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('tty');
  const path = join(ROOT, '.env');
  try { await lstat(path); throw new Error('exists'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  console.log('Free provider setup. Entries are hidden; Enter skips a provider. No account is created and no API request is sent.');
  const values = [];
  for (const name of KEY_NAMES) {
    const value = await hiddenInput(`${name}: `);
    if (value && !/^[A-Za-z0-9._-]{8,512}$/.test(value)) throw new Error('format');
    values.push(`${name}=${value}`);
  }
  const file = await open(path, 'wx', 0o600);
  try { await file.writeFile(values.join('\n') + '\n'); } finally { await file.close(); }
  console.log('Saved owner-only .env. Values were not printed. Next: npm run data:status.');
} catch (error) {
  const messages = {
    tty: 'Run this command yourself in an interactive terminal. Do not paste keys into chat or command arguments.',
    exists: '.env already exists and was not overwritten. Edit it locally to update keys, keeping owner-only permissions.',
    cancelled: 'Cancelled. No key file was written.',
    format: 'A key had an unexpected format. No key file was written.',
  };
  console.error(messages[error.message] || 'Key setup could not finish. No secret was printed; check local permissions.');
  process.exitCode = 1;
}
