import test from 'node:test';
import assert from 'node:assert/strict';
import {policyFor, isRscRequest} from '../../worker/edge-cache.ts';
import {secondsUntilMidnight} from '../../lib/time.ts';

test('Cached copies expire at the local midnight of the zone the page is about', () => {
  // 16:30 UTC is 23:30 in Jakarta: half an hour of validity left, not an hour.
  const beforeJakartaMidnight = new Date('2026-09-07T16:30:00Z');
  const jakarta = policyFor('/ar/prayer-times/jakarta', beforeJakartaMidnight);
  assert.equal(jakarta.sMaxAge, 1800);

  // The same instant is 19:30 in Riyadh, so a Riyadh page still has hours left
  // and is capped at the one-hour ceiling instead.
  const riyadh = policyFor('/ar/prayer-times/riyadh', beforeJakartaMidnight);
  assert.equal(riyadh.sMaxAge, 3600);

  // Never below a minute, however close midnight is.
  const oneSecondBefore = new Date('2026-09-07T16:59:59Z');
  assert.equal(policyFor('/en/prayer-times/jakarta', oneSecondBefore).sMaxAge, 60);
});

test('Every route class gets a policy, and unknown paths get none', () => {
  const now = new Date('2026-09-07T09:00:00Z');
  assert.equal(policyFor('/ar/about', now).sMaxAge, 86_400, 'static page');
  assert.ok(policyFor('/ar', now).sMaxAge <= 3600, 'home page');
  assert.ok(policyFor('/en/converter', now).sMaxAge <= 3600, 'tool page');
  assert.equal(policyFor('/robots.txt', now).sMaxAge, 3600);
  assert.equal(policyFor('/sitemap.xml', now).sMaxAge, 3600);
  assert.equal(policyFor('/api/prayers', now), null, 'the API sets its own');
  assert.equal(policyFor('/assets/app-abc123.js', now), null, 'assets are immutable already');
  assert.equal(policyFor('/fr', now), null, 'not a language route');
});

test('RSC navigations are never served from the shared cache', () => {
  const plain = new Request('https://yourdaynow.online/ar');
  const rsc = new Request('https://yourdaynow.online/ar', {headers: {RSC: '1'}});
  const prefetch = new Request('https://yourdaynow.online/ar', {
    headers: {'Next-Router-Prefetch': '1'},
  });
  assert.equal(isRscRequest(plain), false);
  assert.equal(isRscRequest(rsc), true);
  assert.equal(isRscRequest(prefetch), true);
});

test('Seconds until midnight tracks the zone, and survives a bad one', () => {
  const noon = new Date('2026-09-07T12:00:00Z');
  assert.equal(secondsUntilMidnight('UTC', noon), 43_200);
  assert.equal(secondsUntilMidnight('Asia/Riyadh', noon), 32_400, 'UTC+3');
  assert.equal(secondsUntilMidnight('Not/AZone', noon), 86_400, 'falls back to a whole day');
});
