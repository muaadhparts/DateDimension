// Manage the encrypted credentials table (lib/credentials.ts).
//
//   npm run credentials -- generate-key            print a new APP_KEY for .env
//   npm run credentials -- set google_maps api_key < key.txt
//   npm run credentials -- list                    names and dates, never values
//
// `set` reads the value from standard input so it never appears in the shell
// history or in `ps`.
import {
  generateAppKey,
  listCredentials,
  writeCredential,
  databasePath,
} from '../lib/credentials.ts';

const [command, provider, keyName] = process.argv.slice(2);

async function stdin() {
  let text = '';
  for await (const chunk of process.stdin) text += chunk;
  return text.trim();
}

if (command === 'generate-key') {
  console.log(generateAppKey());
} else if (command === 'set' && provider && keyName) {
  const value = await stdin();
  if (!value) {
    console.error('No value on standard input.');
    process.exit(1);
  }
  writeCredential(provider, keyName, value);
  console.log(`Stored ${provider}/${keyName} (live) in ${databasePath()}`);
} else if (command === 'list') {
  console.table(listCredentials());
} else {
  console.error('Usage: credentials generate-key | set <provider> <key_name> | list');
  process.exit(1);
}
