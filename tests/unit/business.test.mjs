import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBusiness as calc,
  parseBusinessNumber as parse,
  evaluateArithmetic as evaluate,
} from '../../lib/business.ts';
const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
test('Tax addition and extraction are inverse, not a discount', () => {
  near(calc('tax-add', 100, 15).value, 115);
  near(calc('tax-remove', 115, 15).value, 100);
  near(calc('tax-remove', 115, 15).details[0], 15);
  near(calc('tax-add', 100, 0).value, 100);
});
test('Discounts, increases, recovered prices and sequential tax', () => {
  near(calc('discount', 100, 20).value, 80);
  near(calc('increase', 100, 20).value, 120);
  near(calc('original', 80, 20).value, 100);
  near(calc('invoice', 100, 20, 15).value, 92);
  near(calc('discount', 100, 100).value, 0);
  assert.equal(calc('original', 0, 100), null);
  assert.equal(calc('discount', 100, 101), null);
});
test('Ratios, signed changes, profit and loss use correct denominators', () => {
  near(calc('percent', 100, 20).value, 20);
  near(calc('portion', 20, 100).value, 20);
  near(calc('change', 100, 80).value, -20);
  near(calc('profit', 80, 100).details[0], 20);
  near(calc('profit', 80, 100).details[1], 25);
  near(calc('profit', 100, 80).value, -20);
  assert.equal(calc('portion', 1, 0), null);
  assert.equal(calc('change', 0, 10), null);
  assert.equal(calc('profit', 0, 10), null);
});
test('Localized inputs and bounds are validated without coercing blanks', () => {
  assert.equal(parse('١٬٢٣٤٫٥٠'), 1234.5);
  assert.equal(parse('۱۲۳٫۵'), 123.5);
  assert.equal(parse('1,234.50'), 1234.5);
  for (const value of ['', '1,5', '1,23,456', 'Infinity', '1e5', '--1', '1000000000001'])
    assert.equal(parse(value), null);
  assert.equal(calc('tax-add', -1, 15), null);
  assert.equal(calc('tax-add', 1e12, 15), null);
  assert.equal(calc('tax-add', NaN, 15), null);
});
test('Arithmetic supports precedence and parentheses without executing code', () => {
  assert.equal(evaluate('(١٠٠ + 20) × 2'), 240);
  assert.equal(evaluate('2+3*4'), 14);
  assert.equal(evaluate('-2 * (3 + 4)'), -14);
  assert.equal(evaluate('0.1+0.2')?.toFixed(2), '0.30');
  for (const value of ['1/0', '(2+3', '2..3', 'globalThis', '2**3', '2(3)', '', '9'.repeat(201)])
    assert.equal(evaluate(value), null);
});
