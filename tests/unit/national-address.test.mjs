import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  addressQuery,
  cleanFields,
  coordinatesFromMapsUrl,
  fieldsProblem,
  findShortCode,
  findUrl,
  hasWrittenAddress,
  isGoogleMapsUrl,
  matchesNumbers,
  mismatches,
  normaliseShortCode,
  parseCoordinates,
  parseResult,
  pickResult,
  placeNameFromMapsUrl,
  PLUS_CODE,
} from '../../lib/national-address/core.ts';

// Google's real answer for address=QBWA4294&region=sa&language=ar: the building
// itself first, then a neighbouring record that shares its code.
const {results} = JSON.parse(
  readFileSync(new URL('../fixtures/geocode-QBWA4294.json', import.meta.url), 'utf8'),
);

test('Short addresses are normalised the way people type them', () => {
  for (const typed of [
    'QBWA4294',
    'qbwa4294',
    ' QBWA 4294 ',
    'QBWA-4294',
    'QBWA٤٢٩٤',
    'qbwa۴۲۹۴',
  ]) {
    assert.equal(normaliseShortCode(typed), 'QBWA4294', typed);
  }
  for (const bad of ['', 'QBW4294', 'QBWA429', 'QBWA42945', '1BWA4294', 'قبوا4294']) {
    assert.equal(normaliseShortCode(bad), null, bad);
  }
});

test('A Google result becomes every national address field', () => {
  assert.deepEqual(parseResult(results[0]), {
    shortCode: 'QBWA4294',
    building: '4294',
    street: 'طريق الملك فهد',
    additional: '6309',
    district: 'حي المنتزه',
    city: 'بريدة',
    region: 'منطقة القصيم',
    postalCode: '52381',
    formatted: 'QBWA4294، 4294 طريق الملك فهد، 6309، حي المنتزه، بريدة 52381، السعودية',
    lat: 26.3468863,
    lon: 43.950986,
  });
});

test('A district given only as a bare political component is still read', () => {
  const result = structuredClone(results[0]);
  const district = result.address_components.find((c) => c.types.includes('sublocality'));
  district.types = ['political'];
  assert.equal(parseResult(result).district, 'حي المنتزه');
});

test('The additional number falls back to a four-digit subpremise', () => {
  const result = structuredClone(results[0]);
  result.address_components = result.address_components.filter(
    (c) => !c.types.includes('postal_code_suffix'),
  );
  result.address_components.push({long_name: '6309', short_name: '6309', types: ['subpremise']});
  assert.equal(parseResult(result).additional, '6309');
});

test('The right building is picked for a code, a building number, or a point', () => {
  assert.equal(pickResult(results, {code: 'QBWA4294'}), results[0]);
  assert.equal(pickResult(results, {code: 'QBWA0000'}), undefined);
  assert.equal(pickResult(results, {building: '4294'}), results[0]);
  assert.equal(pickResult(results), results[0]);
  // A numeric premise is a plot number, not a short address.
  const plot = {address_components: [{long_name: '7250', short_name: '7250', types: ['premise']}]};
  assert.equal(pickResult([plot]), undefined);
  assert.equal(pickResult([plot, results[1]]), results[1]);
});

test('Typed fields are cleaned, checked and written as a findable address', () => {
  const fields = cleanFields({
    building: '٤٢٩٤',
    street: '  طريق   الملك فهد ',
    additional: '6309',
    district: 'المنتزه',
    city: 'بريدة',
    postalCode: '52381 ',
    extra: 'ignored',
  });
  assert.deepEqual(fields, {
    building: '4294',
    street: 'طريق الملك فهد',
    additional: '6309',
    district: 'المنتزه',
    city: 'بريدة',
    postalCode: '52381',
  });
  assert.equal(fieldsProblem(fields), null);
  assert.equal(
    addressQuery(fields, 'ar'),
    '4294 طريق الملك فهد، حي المنتزه، بريدة 52381، السعودية',
  );
  assert.equal(fieldsProblem({...fields, building: '42'}), 'building');
  // The numbers alone are enough; names are optional.
  const numbers = {...fields, street: '', district: '', city: ''};
  assert.equal(fieldsProblem(numbers), null);
  assert.equal(hasWrittenAddress(numbers), false, 'searched by numbers');
  assert.equal(hasWrittenAddress(fields), true, 'one call on the written address');
  assert.equal(fieldsProblem({...numbers, postalCode: ''}), 'postalCode');
  assert.equal(fieldsProblem({...fields, postalCode: ''}), null, 'street and city also work');
  assert.equal(fieldsProblem({...fields, postalCode: '', city: ''}), 'city');
});

test('Only typed numbers that disagree with the record are reported', () => {
  const found = parseResult(results[0]);
  const typed = cleanFields({building: '4294', street: 'x', city: 'y', additional: '6300'});
  assert.deepEqual(mismatches(typed, found), ['additional']);
  assert.deepEqual(mismatches({...typed, additional: ''}, found), []);
});

test('A building without a street number takes it from its short address', () => {
  const result = structuredClone(results[0]);
  result.address_components = result.address_components.filter(
    (c) => !c.types.includes('street_number'),
  );
  assert.equal(parseResult(result).building, '4294');
});

test('A found building must agree with every number that was typed', () => {
  const found = parseResult(results[0]);
  const typed = cleanFields({building: '4294', postalCode: '52381', additional: '6309'});
  assert.equal(matchesNumbers(typed, found), true);
  assert.equal(matchesNumbers({...typed, additional: ''}, found), true);
  assert.equal(matchesNumbers({...typed, additional: '6300'}, found), false);
  assert.equal(matchesNumbers({...typed, postalCode: '52382'}, found), false);
  assert.equal(matchesNumbers({...typed, building: '4295'}, found), false);
});

test('Short addresses are found inside pasted text', () => {
  assert.equal(findShortCode('العنوان: QBWA4294 بريدة'), 'QBWA4294');
  assert.equal(findShortCode('qbwa 4294'), 'QBWA4294');
  assert.equal(findShortCode('8XW2+P7X، طريق الملك فهد'), null);
  assert.equal(findShortCode('26.346944, 43.950722'), null);
});

test('Coordinates are read however they were copied', () => {
  const near = (actual, lat, lon) => {
    assert.ok(actual, 'parsed');
    assert.ok(
      Math.abs(actual.lat - lat) < 1e-5 && Math.abs(actual.lon - lon) < 1e-5,
      JSON.stringify(actual),
    );
  };
  near(parseCoordinates('26.346944, 43.950722'), 26.346944, 43.950722);
  // Right-to-left text pastes the pair reversed; Saudi ranges put it right.
  near(parseCoordinates('43.950722 ,26.346944'), 26.346944, 43.950722);
  near(parseCoordinates('٢٦٫٣٤٦٩٤٤، ٤٣٫٩٥٠٧٢٢'), 26.346944, 43.950722);
  near(parseCoordinates('26°20\'49.0"N 43°57\'02.6"E'), 26.346944, 43.950722);
  // As a phone's share sheet mixes them.
  near(
    parseCoordinates('49.0\'20°26 وا"N 43°57\'02.6"E 43.950722 ,26.346944 وا'),
    26.346944,
    43.950722,
  );
  assert.equal(parseCoordinates('QBWA4294'), null);
  assert.equal(parseCoordinates('4294 6309 52381'), null);
});

test('Plus codes and links are recognised', () => {
  assert.ok(PLUS_CODE.test('8XW2+P7X، طريق الملك فهد، حي المنتزة، بريدة 52381'));
  assert.ok(PLUS_CODE.test('7HR58XW2+P7X'));
  assert.ok(!PLUS_CODE.test('QBWA4294'));
  assert.equal(
    findUrl('شوف الموقع https://maps.app.goo.gl/8QbLfYfBtGBxDWxJA تحياتي'),
    'https://maps.app.goo.gl/8QbLfYfBtGBxDWxJA',
  );
});

test('Only Google map hosts are followed', () => {
  for (const ok of [
    'https://maps.app.goo.gl/8QbLfYfBtGBxDWxJA',
    'https://www.google.com/maps/place/x/@26.3,43.9',
    'https://maps.google.com/?q=26.3,43.9',
    'https://www.google.com.sa/maps/@26.3,43.9,17z',
    'https://goo.gl/maps/abc',
  ]) {
    assert.ok(isGoogleMapsUrl(ok), ok);
  }
  for (const bad of [
    'https://evil.example/maps.app.goo.gl',
    'https://maps.app.goo.gl.evil.example/x',
    'http://127.0.0.1/maps',
    'file:///etc/passwd',
    'https://google.evil.com/maps',
  ]) {
    assert.ok(!isGoogleMapsUrl(bad), bad);
  }
});

test('The pin in a Google Maps URL wins over the view centre', () => {
  // The expanded form of https://maps.app.goo.gl/C14snNPaViDxmPSZ6: the view is
  // centred 7 km east of the pin.
  const url =
    'https://www.google.com/maps/place/%D8%AA%D8%B4%D9%84%D9%8A%D8%AD+%D8%B5%D8%A7%D9%84%D8%AD%E2%80%AD/@26.2990187,44.1501844,13z/data=!4m7!3m6!1s0x157f5f6eb51c7e89:0xdf4e012d2b08203d!8m2!3d26.2990187!4d44.0739667!15sCi0';
  assert.deepEqual(coordinatesFromMapsUrl(url), {lat: 26.2990187, lon: 44.0739667});
  assert.equal(placeNameFromMapsUrl(url), 'تشليح صالح');
  assert.deepEqual(coordinatesFromMapsUrl('https://www.google.com/maps/@26.35,43.95,17z'), {
    lat: 26.35,
    lon: 43.95,
  });
  assert.deepEqual(coordinatesFromMapsUrl('https://maps.google.com/?q=26.35,43.95'), {
    lat: 26.35,
    lon: 43.95,
  });
  assert.equal(coordinatesFromMapsUrl('https://maps.app.goo.gl/8QbLfYfBtGBxDWxJA'), null);
});
