import test from 'node:test';
import assert from 'node:assert/strict';
import {createRateLimiter, clientKey} from '../../lib/rate-limit.ts';

test('A client gets its allowance, then waits', () => {
  let clock = 1_000_000;
  const check = createRateLimiter({limit: 3, windowMs: 1000, now: () => clock});

  for (let i = 0; i < 3; i++) assert.equal(check('a').allowed, true, `request ${i + 1}`);

  const blocked = check('a');
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds >= 1);

  // A third of the window refills one token.
  clock += 340;
  assert.equal(check('a').allowed, true);
  assert.equal(check('a').allowed, false);

  // A full window refills everything.
  clock += 1000;
  for (let i = 0; i < 3; i++) assert.equal(check('a').allowed, true);
});

test('Clients are limited independently', () => {
  let clock = 0;
  const check = createRateLimiter({limit: 1, windowMs: 1000, now: () => clock});
  assert.equal(check('a').allowed, true);
  assert.equal(check('a').allowed, false);
  assert.equal(check('b').allowed, true, 'b is unaffected by a');
});

test('The limiter cannot grow without bound', () => {
  let clock = 0;
  const check = createRateLimiter({limit: 1, windowMs: 1000, maxKeys: 50, now: () => clock});
  for (let i = 0; i < 5000; i++) {
    clock += 1;
    check(`client-${i}`);
  }
  // Still enforcing after the churn.
  assert.equal(check('steady').allowed, true);
  assert.equal(check('steady').allowed, false);
});

test('The client key prefers what Cloudflare reports', () => {
  const url = 'https://yourdaynow.online/api/prayers';
  assert.equal(
    clientKey(new Request(url, {headers: {'cf-connecting-ip': '203.0.113.7'}})),
    '203.0.113.7',
  );
  assert.equal(
    clientKey(new Request(url, {headers: {'x-forwarded-for': '203.0.113.9, 10.0.0.1'}})),
    '203.0.113.9',
  );
  assert.equal(
    clientKey(
      new Request(url, {
        headers: {'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '198.51.100.1'},
      }),
    ),
    '203.0.113.7',
    'Cloudflare wins over a header the client can set',
  );
  assert.equal(clientKey(new Request(url)), 'unknown');
});
