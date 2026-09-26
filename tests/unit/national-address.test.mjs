import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  addressQuery,
  cleanFields,
  fieldsProblem,
  mismatches,
  normaliseShortCode,
  parseResult,
  pickResult,
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
  assert.equal(fieldsProblem({...fields, street: ''}), 'street', 'a district is not enough');
  assert.equal(fieldsProblem({...fields, district: ''}), null);
  assert.equal(fieldsProblem({...fields, city: '', postalCode: ''}), 'city');
  assert.equal(fieldsProblem({...fields, city: ''}), null);
});

test('Only typed numbers that disagree with the record are reported', () => {
  const found = parseResult(results[0]);
  const typed = cleanFields({building: '4294', street: 'x', city: 'y', additional: '6300'});
  assert.deepEqual(mismatches(typed, found), ['additional']);
  assert.deepEqual(mismatches({...typed, additional: ''}, found), []);
});
