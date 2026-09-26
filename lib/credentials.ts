import {createCipheriv, createDecipheriv, randomBytes} from 'node:crypto';
import {existsSync, mkdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {envDirectory, loadServerEnv} from './server-env.ts';
import {log} from './log.ts';

/**
 * Third-party secrets, encrypted at rest in a `credentials` table.
 *
 * The same shape as the Laravel projects' table, so a key is found by
 * provider + key name + environment and never by reading a plain-text file.
 * The value is sealed with AES-256-GCM under APP_KEY, which lives only in the
 * deployment's .env: a copy of the database alone reveals nothing.
 *
 * The table is SQLite, opened through Node's built-in driver, so there is no
 * database server and no dependency. On Forge the file sits beside .env at the
 * site root, which survives every release.
 */

type Statement = {
  get(...params: unknown[]): unknown;
  run(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
};
type Database = {exec(sql: string): void; prepare(sql: string): Statement; close(): void};
type SqliteModule = {DatabaseSync: new (path: string) => Database};

export type Environment = 'live' | 'sandbox';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS credentials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  credential_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  key_name TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'live',
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_used_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (credential_type, provider, key_name, environment)
)`;

const VERSION = 'v1';

/** APP_KEY as 32 bytes: `base64:` + 44 characters, the Laravel format. */
export function parseAppKey(value: string | undefined): Buffer | null {
  const raw = value?.trim();
  if (!raw) return null;
  const key = Buffer.from(raw.startsWith('base64:') ? raw.slice(7) : raw, 'base64');
  return key.length === 32 ? key : null;
}

export function generateAppKey(): string {
  return 'base64:' + randomBytes(32).toString('base64');
}

export function encryptValue(plain: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), body]
    .map((part) => (typeof part === 'string' ? part : part.toString('base64')))
    .join('.');
}

/** Throws when the value was sealed under another key or has been altered. */
export function decryptValue(sealed: string, key: Buffer): string {
  const [version, iv, tag, body] = sealed.split('.');
  if (version !== VERSION || !iv || !tag || body === undefined) {
    throw new Error('Unrecognised credential format');
  }
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(body, 'base64')), decipher.final()]).toString(
    'utf8',
  );
}

function appKey(): Buffer | null {
  loadServerEnv();
  return parseAppKey(process.env.APP_KEY);
}

export function databasePath(): string {
  loadServerEnv();
  const configured = process.env.CREDENTIALS_DB?.trim();
  if (configured) return configured;
  return join(envDirectory() ?? process.cwd(), 'storage', 'credentials.sqlite');
}

function sqlite(): SqliteModule | null {
  // Resolved at run time so the Cloudflare bundle, which has no SQLite, never
  // sees the import. There the store is simply absent.
  const get = (process as unknown as {getBuiltinModule?: (id: string) => unknown}).getBuiltinModule;
  return (get?.('node:sqlite') as SqliteModule | undefined) ?? null;
}

function open(path: string, create: boolean): Database | null {
  const driver = sqlite();
  if (!driver) return null;
  // Reading never creates an empty database as a side effect.
  if (!create && !existsSync(path)) return null;
  if (create) mkdirSync(dirname(path), {recursive: true});
  const db = new driver.DatabaseSync(path);
  db.exec(SCHEMA);
  return db;
}

type Row = {id: number; encrypted_value: string};

const HOUR = 60 * 60 * 1000;
const cache = new Map<string, {value: string | null; until: number}>();

/**
 * The decrypted value of an active credential, or null. Held in memory for an
 * hour; a missing or unreadable one is retried after a minute.
 */
export function readCredential(
  provider: string,
  keyName: string,
  environment: Environment = 'live',
  type = 'platform_api',
): string | null {
  const id = `${type}/${provider}/${keyName}/${environment}`;
  const hit = cache.get(id);
  if (hit && hit.until > Date.now()) return hit.value;

  let value: string | null = null;
  let db: Database | null = null;
  try {
    const key = appKey();
    db = key ? open(databasePath(), false) : null;
    const row =
      db &&
      (db
        .prepare(
          `SELECT id, encrypted_value FROM credentials
           WHERE credential_type = ? AND provider = ? AND key_name = ? AND environment = ?
             AND is_active = 1`,
        )
        .get(type, provider, keyName, environment) as Row | undefined);
    if (row && key) {
      value = decryptValue(row.encrypted_value, key);
      db!
        .prepare('UPDATE credentials SET last_used_at = ? WHERE id = ?')
        .run(new Date().toISOString(), row.id);
    }
  } catch (error) {
    // Never log the value or the key, only that the read failed.
    log('warn', 'credential_read_failed', {
      credential: id,
      message: error instanceof Error ? error.message : String(error),
    });
    value = null;
  } finally {
    db?.close();
  }

  cache.set(id, {value, until: Date.now() + (value ? HOUR : 60_000)});
  return value;
}

/** Inserts or replaces a credential. Used by `npm run credentials`, not by requests. */
export function writeCredential(
  provider: string,
  keyName: string,
  value: string,
  {
    environment = 'live',
    type = 'platform_api',
    description = null,
  }: {environment?: Environment; type?: string; description?: string | null} = {},
): void {
  const key = appKey();
  if (!key) throw new Error('APP_KEY is missing or is not 32 bytes of base64');
  const db = open(databasePath(), true);
  if (!db) throw new Error('This Node.js has no built-in SQLite (node:sqlite)');
  const now = new Date().toISOString();
  try {
    db.prepare(
      `INSERT INTO credentials
         (credential_type, provider, key_name, encrypted_value, environment, description,
          is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
       ON CONFLICT (credential_type, provider, key_name, environment) DO UPDATE SET
         encrypted_value = excluded.encrypted_value,
         description = COALESCE(excluded.description, credentials.description),
         is_active = 1,
         updated_at = excluded.updated_at`,
    ).run(type, provider, keyName, encryptValue(value, key), environment, description, now, now);
  } finally {
    db.close();
  }
  cache.clear();
}

/** Every stored credential without its value, for the CLI's listing. */
export function listCredentials(): Record<string, unknown>[] {
  const db = open(databasePath(), false);
  if (!db) return [];
  try {
    return db
      .prepare(
        `SELECT credential_type, provider, key_name, environment, is_active, last_used_at,
                updated_at FROM credentials ORDER BY provider, key_name`,
      )
      .all() as Record<string, unknown>[];
  } finally {
    db.close();
  }
}
