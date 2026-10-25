import { collect, dataStatus } from '../src/collection.mjs';
import { CollectionError } from '../src/providers.mjs';

try {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'status' && args.length === 0) {
    console.log(JSON.stringify(await dataStatus(), null, 2));
  } else if (command === 'games') {
    const values = {};
    for (let i = 0; i < args.length; i += 2) {
      if (!['--season', '--cursor'].includes(args[i]) || args[i+1] == null || Object.hasOwn(values, args[i])) throw new CollectionError('INVALID_ARGUMENT','Use --season YEAR and optional --cursor NUMBER.');
      values[args[i]] = Number(args[i+1]);
    }
    const result = await collect('balldontlie', { season: values['--season'], cursor: values['--cursor'] });
    console.log(JSON.stringify(result, null, 2));
    console.log(result.nextCursor == null ? 'No further cursor returned. Full-season coverage remains unverified.' : `One page saved: next cursor ${result.nextCursor}. Wait 13 seconds before the next page. Full-season coverage remains unverified.`);
  } else if (command === 'odds' && args.length === 0) {
    console.log(JSON.stringify(await collect('oddsapi'), null, 2));
  } else throw new CollectionError('INVALID_ARGUMENT', 'Use data:status, data:games -- --season YEAR [--cursor NUMBER], or data:odds.');
} catch (error) {
  console.error(error instanceof CollectionError ? `${error.code}: ${error.message}` : 'LOCAL_SETUP_ERROR: Check local file permissions and setup. No secret or provider error body was printed.');
  process.exitCode = 1;
}
