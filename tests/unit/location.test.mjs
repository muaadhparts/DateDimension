import test from 'node:test';
import assert from 'node:assert/strict';
import {locationFromRequest} from '../../lib/location.ts';

const URL_BASE = 'https://yourdaynow.online/api/location';

test('Cloudflare location headers are read when the edge sends them', () => {
  const detected = locationFromRequest(
    new Request(URL_BASE, {
      headers: {
        'cf-ipcity': 'Sanaa',
        'cf-ipcountry': 'YE',
        'cf-iplatitude': '15.3694',
        'cf-iplongitude': '44.1910',
        'cf-iptimezone': 'Asia/Aden',
      },
    }),
  );
  assert.equal(detected.city, 'Sanaa');
  assert.equal(detected.countryCode, 'YE');
  assert.equal(detected.lat, 15.3694);
  assert.equal(detected.lon, 44.191);
  assert.equal(detected.timezone, 'Asia/Aden');
  assert.equal(detected.source, 'edge');
});

test('Nothing is invented when the edge sends nothing', () => {
  const detected = locationFromRequest(new Request(URL_BASE));
  assert.equal(detected.city, null);
  assert.equal(detected.lat, null);
  assert.equal(detected.source, 'none');
});

test('Malformed coordinates are dropped rather than passed through as NaN', () => {
  const detected = locationFromRequest(
    new Request(URL_BASE, {headers: {'cf-ipcity': 'Cairo', 'cf-iplatitude': 'not-a-number'}}),
  );
  assert.equal(detected.city, 'Cairo');
  assert.equal(detected.lat, null);
  assert.equal(detected.source, 'edge', 'a city alone is still a detection');
});
