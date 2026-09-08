import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * The cached HTML is one copy shared by every visitor, so it cannot carry
 * anyone's time zone. What the page shows instead is resolved in the browser,
 * and this is the order it resolves in.
 */
test('The zone is the visitor’s own choice first, their device next', async () => {
  const device = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const {preferredZone, deviceZone, storeZone} = await import('../../lib/clock-store.ts');

  // Node has no localStorage, which is exactly the "nothing chosen yet" case:
  // the answer must be the device's own zone, not a hardcoded default.
  assert.equal(deviceZone(), device);
  assert.equal(preferredZone(), device, 'with no choice stored, the device wins');

  const saved = new Map();
  globalThis.localStorage = {
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => saved.set(key, value),
  };
  storeZone('Europe/London');
  assert.equal(preferredZone(), 'Europe/London', 'a stored choice beats the device');
  assert.notEqual(preferredZone(), device);
  delete globalThis.localStorage;
});
