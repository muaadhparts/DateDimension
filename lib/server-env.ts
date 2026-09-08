import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';

/**
 * Reads the deployment's .env file into process.env for anything not already
 * set, once, on Node only.
 *
 * The standalone server is started by a supervisor command that carries its own
 * environment, which means Forge's own environment editor did nothing. A secret
 * belongs in that file rather than in a process command line where `ps` shows
 * it, so this makes the file authoritative for anything the daemon does not
 * already define.
 */
let loaded = false;

function candidatePaths(): string[] {
  // dist/standalone/dist/server -> ... -> the release root, which is where
  // Forge symlinks .env.
  const here = process.cwd();
  return [
    join(here, '.env'),
    join(here, '..', '.env'),
    join(here, '..', '..', '.env'),
    join(here, '..', '..', '..', '.env'),
    join(dirname(here), '.env'),
  ];
}

function parse(contents: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) values[key] = value;
  }
  return values;
}

export function loadServerEnv(): void {
  if (loaded) return;
  loaded = true;
  if (typeof process === 'undefined' || !process.versions?.node) return;

  for (const path of candidatePaths()) {
    let contents: string;
    try {
      contents = readFileSync(path, 'utf8');
    } catch {
      continue;
    }
    for (const [key, value] of Object.entries(parse(contents))) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
    return;
  }
}
