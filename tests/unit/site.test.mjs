import test from 'node:test';
import assert from 'node:assert/strict';

/** The module reads process.env once, so each case needs a fresh import. */
let version = 0;
async function loadSite(env) {
  const previous = {SITE_URL: process.env.SITE_URL, PUBLIC_INDEXING: process.env.PUBLIC_INDEXING};
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await import(`../../lib/site.ts?case=${version++}`);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('SITE_URL comes from the environment, without a trailing slash', async () => {
  const configured = await loadSite({SITE_URL: 'https://example.test/'});
  assert.equal(configured.SITE_URL, 'https://example.test');

  const plain = await loadSite({SITE_URL: 'https://example.test'});
  assert.equal(plain.SITE_URL, 'https://example.test');
});

test('An unset SITE_URL falls back to the live origin, never to a preview host', async () => {
  const fallback = await loadSite({SITE_URL: undefined});
  assert.equal(fallback.SITE_URL, 'https://yourdaynow.online');
  assert.ok(!fallback.SITE_URL.includes('chatgpt.site'));
});

test('Indexing is on only for the exact string "true"', async () => {
  assert.equal((await loadSite({PUBLIC_INDEXING: 'true'})).INDEXABLE, true);
  for (const value of ['TRUE', 'True', '1', 'yes', '', undefined]) {
    assert.equal(
      (await loadSite({PUBLIC_INDEXING: value})).INDEXABLE,
      false,
      `PUBLIC_INDEXING=${value}`,
    );
  }
});
