import test from 'node:test';
import assert from 'node:assert/strict';

// A key so the module will call "Google", which is the fake below; no table.
process.env.GOOGLE_MAPS_API_KEY = 'test-key';
process.env.APP_KEY = '';
process.env.CREDENTIALS_DB = 'missing/credentials.sqlite';

const {searchByNumbers, resolveInput, cleanFields} =
  await import('../../lib/national-address/index.ts');

const building = (code, postal, suffix, lat = 26.35, lng = 43.95) => ({
  types: ['premise'],
  geometry: {location: {lat, lng}, location_type: 'ROOFTOP'},
  address_components: [
    {long_name: code, short_name: code, types: ['premise']},
    {long_name: 'بريدة', short_name: 'بريدة', types: ['locality', 'political']},
    {long_name: postal, short_name: postal, types: ['postal_code']},
    {long_name: suffix, short_name: suffix, types: ['postal_code_suffix']},
  ],
});

/** Answers like Google Geocoding, and records every URL asked for. */
function fakeGoogle(routes) {
  const asked = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    asked.push(url.href);
    for (const [match, reply] of routes) {
      if (match(url, init)) return typeof reply === 'function' ? reply(url) : Response.json(reply);
    }
    return Response.json({status: 'ZERO_RESULTS', results: []});
  };
  return {asked, restore: () => (globalThis.fetch = real)};
}

const param = (name, value) => (url) => url.searchParams.get(name) === value;

test('Numbers alone find the building through the prefixes used in its postal code', async () => {
  const google = fakeGoogle([
    [
      param('components', 'postal_code:52381|country:SA'),
      {
        status: 'OK',
        results: [
          {
            geometry: {
              location: {lat: 26.358, lng: 43.941},
              bounds: {
                northeast: {lat: 26.369, lng: 43.957},
                southwest: {lat: 26.343, lng: 43.927},
              },
            },
            address_components: [],
          },
        ],
      },
    ],
    // Every grid point sees two areas; QBWD is the more common one.
    [
      (url) => url.searchParams.has('latlng'),
      {
        status: 'OK',
        results: [
          building('QBWD1111', '52381', '1000'),
          building('QBWD2222', '52381', '1001'),
          building('QBWA3333', '52381', '1002'),
        ],
      },
    ],
    // QBWD4294 exists but belongs to another postal code.
    [
      param('address', 'QBWD4294'),
      {status: 'OK', results: [building('QBWD4294', '52382', '7000')]},
    ],
    [
      param('address', 'QBWA4294'),
      {status: 'OK', results: [building('QBWA4294', '52381', '6309')]},
    ],
  ]);
  try {
    const typed = cleanFields({building: '4294', postalCode: '52381', additional: '6309'});
    const found = await searchByNumbers(typed, 'ar');
    assert.equal(found?.shortCode, 'QBWA4294');
    assert.equal(found?.building, '4294', 'taken from the code when Google has no street number');
    const first = google.asked.length;
    assert.equal(first, 1 + 9 + 2, 'postal code, 3×3 grid, then candidates in order');

    // The same postal code again reuses the prefixes and the answers.
    await searchByNumbers(typed, 'ar');
    assert.equal(google.asked.length, first, 'fully cached');

    const wrongSuffix = {...typed, additional: '1234'};
    assert.equal(await searchByNumbers(wrongSuffix, 'ar'), null, 'no building matches');
  } finally {
    google.restore();
  }
});

test('A shared Maps link is followed on Google only, and its pin is used', async () => {
  const google = fakeGoogle([
    [
      (url) => url.hostname === 'maps.app.goo.gl',
      () =>
        new Response(null, {
          status: 302,
          headers: {
            location:
              'https://www.google.com/maps/place/x/@26.2990187,44.1501844,13z/data=!3d26.2990187!4d44.0739667',
          },
        }),
    ],
    [
      param('latlng', '26.29902,44.07397'),
      {status: 'OK', results: [building('QBUA1234', '52367', '5555', 26.2991, 44.0741)]},
    ],
  ]);
  try {
    const resolved = await resolveInput('https://maps.app.goo.gl/C14snNPaViDxmPSZ6', 'ar');
    assert.equal(resolved.address?.shortCode, 'QBUA1234');
    assert.deepEqual(resolved.point, {lat: 26.2990187, lon: 44.0739667});
    assert.ok(!google.asked.some((u) => u.includes('44.15018')), 'the view centre is ignored');

    const before = google.asked.length;
    const elsewhere = await resolveInput('https://evil.example/redirect?to=maps', 'ar');
    assert.equal(elsewhere.address, null);
    assert.equal(google.asked.length, before, 'a foreign link is never fetched');
  } finally {
    google.restore();
  }
});

test('Pasted coordinates and short addresses go straight to the right lookup', async () => {
  const google = fakeGoogle([
    [
      param('latlng', '26.34694,43.95072'),
      {status: 'OK', results: [building('QBWA4294', '52381', '6309')]},
    ],
    [
      param('address', 'QBWA2889'),
      {status: 'OK', results: [building('QBWA2889', '52382', '7214')]},
    ],
  ]);
  try {
    assert.equal((await resolveInput('43.950722 ,26.346944', 'ar')).address?.shortCode, 'QBWA4294');
    assert.equal(
      (await resolveInput('عنواني QBWA2889 شكرًا', 'ar')).address?.shortCode,
      'QBWA2889',
    );
  } finally {
    google.restore();
  }
});
