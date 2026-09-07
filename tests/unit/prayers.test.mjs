import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCityPrayerTimes,
  getPrayerTimes,
  parsePrayerQuery,
  InvalidPrayerRequest,
} from '../../lib/prayers/index.ts';

const KEYS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const minutes = (value) => {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
};

/** Recorded from api.aladhan.com on 2026-09-07; tolerance is 4 minutes, the
 * documented divergence between adhan's solar model and the provider's. */
const REFERENCE = [
  {
    slug: 'makkah',
    method: '3',
    school: '0',
    expected: {
      Fajr: '04:51',
      Sunrise: '06:06',
      Dhuhr: '12:19',
      Asr: '15:45',
      Maghrib: '18:32',
      Isha: '19:42',
    },
  },
  {
    slug: 'riyadh',
    method: '4',
    school: '0',
    expected: {
      Fajr: '04:17',
      Sunrise: '05:36',
      Dhuhr: '11:51',
      Asr: '15:20',
      Maghrib: '18:06',
      Isha: '19:36',
    },
  },
  {
    slug: 'london',
    method: '3',
    school: '0',
    expected: {
      Fajr: '04:22',
      Sunrise: '06:23',
      Dhuhr: '12:59',
      Asr: '16:36',
      Maghrib: '19:34',
      Isha: '21:26',
    },
  },
];

test('Curated cities match the published timetable within four minutes', () => {
  for (const {slug, method, school, expected} of REFERENCE) {
    const data = getCityPrayerTimes(slug, '2026-09-07', method, school);
    assert.ok(data, `${slug} has coordinates`);
    assert.equal(data.meta.source, 'local');
    for (const key of KEYS) {
      const delta = Math.abs(minutes(data.timings[key]) - minutes(expected[key]));
      assert.ok(
        delta <= 4,
        `${slug} ${key}: got ${data.timings[key]}, expected about ${expected[key]}`,
      );
    }
  }
});

test('Prayer times stay in order and carry the location metadata', () => {
  for (const slug of [
    'riyadh',
    'makkah',
    'cairo',
    'dubai',
    'sanaa',
    'london',
    'new-york',
    'jakarta',
  ]) {
    for (const date of ['2026-09-07', '2026-12-21', '2027-06-21']) {
      const data = getCityPrayerTimes(slug, date);
      assert.ok(data, slug);
      const order = KEYS.map((key) => minutes(data.timings[key]));
      for (let i = 1; i < order.length; i++) {
        assert.ok(
          order[i] > order[i - 1],
          `${slug} ${date}: ${KEYS[i]} must follow ${KEYS[i - 1]}`,
        );
      }
      assert.match(data.timings.Fajr, /^\d{2}:\d{2}$/);
      assert.equal(typeof data.meta.timezone, 'string');
      assert.equal(data.meta.method.id, 3);
    }
  }
  assert.equal(getCityPrayerTimes('atlantis', '2026-09-07'), null);
});

test('Umm al-Qura uses the 120 minute Ramadan interval', () => {
  // 1448-09-01 falls in February 2027.
  const ramadan = getCityPrayerTimes('makkah', '2027-02-15', '4', '0');
  const gap = minutes(ramadan.timings.Isha) - minutes(ramadan.timings.Maghrib);
  assert.equal(gap, 120, `Ramadan Isha interval was ${gap} minutes`);
  const ordinary = getCityPrayerTimes('makkah', '2026-09-07', '4', '0');
  assert.equal(minutes(ordinary.timings.Isha) - minutes(ordinary.timings.Maghrib), 90);
});

test('The Hanafi school pushes Asr later, and only Asr', () => {
  const shafi = getCityPrayerTimes('riyadh', '2026-09-07', '3', '0');
  const hanafi = getCityPrayerTimes('riyadh', '2026-09-07', '3', '1');
  assert.ok(minutes(hanafi.timings.Asr) > minutes(shafi.timings.Asr));
  assert.equal(hanafi.timings.Fajr, shafi.timings.Fajr);
  assert.equal(hanafi.timings.Maghrib, shafi.timings.Maghrib);
});

test('Query parsing rejects everything the API used to reject', () => {
  const ok = 'date=2026-09-07&city=Riyadh&country=Saudi Arabia';
  const rejects = (query, why) =>
    assert.throws(() => parsePrayerQuery(new URLSearchParams(query)), InvalidPrayerRequest, why);

  rejects('date=2026-02-31&city=Riyadh&country=Saudi Arabia', 'impossible date');
  rejects('date=2026-9-7&city=Riyadh&country=Saudi Arabia', 'unpadded date');
  rejects('date=1899-12-31&city=Riyadh&country=Saudi Arabia', 'before 1900');
  rejects('date=2101-01-01&city=Riyadh&country=Saudi Arabia', 'after 2100');
  rejects('city=Riyadh&country=Saudi Arabia', 'missing date');
  rejects(`${ok}&method=6`, 'unsupported method');
  rejects(`${ok}&method=99`, 'unknown method');
  rejects(`${ok}&school=2`, 'unknown school');
  rejects('date=2026-09-07&lat=91&lon=0', 'latitude out of range');
  rejects('date=2026-09-07&lat=0&lon=-181', 'longitude out of range');
  rejects('date=2026-09-07&lat=abc&lon=0', 'non-numeric latitude');
  rejects('date=2026-09-07&country=Saudi Arabia', 'missing city');
  rejects('date=2026-09-07&city=Riyadh', 'missing country');
  rejects(`date=2026-09-07&city=${'x'.repeat(101)}&country=Saudi Arabia`, 'city too long');
  rejects(`date=2026-09-07&city=Riyadh&country=${'x'.repeat(81)}`, 'country too long');

  for (const method of ['1', '2', '3', '4', '5', '11', '13', '16']) {
    const parsed = parsePrayerQuery(new URLSearchParams(`${ok}&method=${method}`));
    assert.equal(parsed.method, method);
  }
});

test('A known city never reaches the network', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error('the local path must not call out');
  };
  try {
    const data = await getPrayerTimes({
      date: '2026-09-07',
      method: '3',
      school: '0',
      location: {kind: 'query', city: 'Riyadh', country: 'Saudi Arabia'},
    });
    assert.equal(data.meta.source, 'local');
    assert.equal(data.meta.timezone, 'Asia/Riyadh');

    const byCoords = await getPrayerTimes({
      date: '2026-09-07',
      method: '3',
      school: '0',
      location: {kind: 'coords', lat: 51.5074, lon: -0.1278, zone: 'Europe/London'},
    });
    assert.equal(byCoords.meta.timezone, 'Europe/London');
  } finally {
    globalThis.fetch = realFetch;
  }
});
