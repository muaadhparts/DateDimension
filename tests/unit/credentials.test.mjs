import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'credentials-'));
process.env.CREDENTIALS_DB = join(dir, 'credentials.sqlite');

const {
  decryptValue,
  encryptValue,
  generateAppKey,
  listCredentials,
  parseAppKey,
  readCredential,
  writeCredential,
} = await import('../../lib/credentials.ts');

test.after(() => rmSync(dir, {recursive: true, force: true}));

test('Values are sealed with AES-256-GCM and refuse the wrong key or tampering', () => {
  const key = parseAppKey(generateAppKey());
  assert.equal(key.length, 32);
  const sealed = encryptValue('secret-value', key);
  assert.notEqual(encryptValue('secret-value', key), sealed, 'a fresh IV every time');
  assert.equal(decryptValue(sealed, key), 'secret-value');
  assert.throws(() => decryptValue(sealed, parseAppKey(generateAppKey())));
  const [v, iv, tag, body] = sealed.split('.');
  const flipped = Buffer.from(body, 'base64');
  flipped[0] ^= 1;
  assert.throws(() => decryptValue([v, iv, tag, flipped.toString('base64')].join('.'), key));
});

test('APP_KEY must be 32 bytes', () => {
  assert.equal(parseAppKey(undefined), null);
  assert.equal(parseAppKey('base64:' + Buffer.alloc(16).toString('base64')), null);
  assert.ok(parseAppKey('base64:' + Buffer.alloc(32).toString('base64')));
});

test('The table stores ciphertext and reads back the plain value', () => {
  process.env.APP_KEY = generateAppKey();
  assert.equal(readCredential('nothing', 'here'), null, 'no database yet, no error');
  writeCredential('google_maps', 'api_key', 'AIza-test-value');
  assert.equal(readCredential('google_maps', 'api_key'), 'AIza-test-value');
  assert.doesNotMatch(readFileSync(process.env.CREDENTIALS_DB, 'latin1'), /AIza-test-value/);
  writeCredential('google_maps', 'api_key', 'AIza-rotated');
  assert.equal(readCredential('google_maps', 'api_key'), 'AIza-rotated');
  const rows = listCredentials();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].provider, 'google_maps');
  assert.ok(!('encrypted_value' in rows[0]));
});
