/** Pure arithmetic only: no rates fetched and no financial data transmitted. */
export type BusinessMode =
  | 'percent'
  | 'tax-add'
  | 'tax-remove'
  | 'discount'
  | 'increase'
  | 'original'
  | 'portion'
  | 'change'
  | 'profit'
  | 'invoice';
export function parseBusinessNumber(raw: string): number | null {
  const text = raw
    .trim()
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776))
    .replace(/٫/g, '.');
  // Accept correctly grouped thousands, but never silently reinterpret a decimal comma.
  const normalized = /^[+-]?\d{1,3}(?:[,٬]\d{3})+(?:\.\d+)?$/.test(text)
    ? text.replace(/[,٬]/g, '')
    : text;
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) && Math.abs(value) <= 1e12 ? value : null;
}
export type BusinessResult = {value: number; details: number[]; formula: string};
export function calculateBusiness(
  mode: BusinessMode,
  a: number,
  b: number,
  c = 0,
): BusinessResult | null {
  if (![a, b, c].every(Number.isFinite) || a < 0 || b < 0 || c < 0 || Math.max(a, b, c) > 1e12)
    return null;
  let result: BusinessResult;
  switch (mode) {
    case 'percent':
      result = {value: (a * b) / 100, details: [a, b], formula: 'A × B ÷ 100'};
      break;
    case 'tax-add':
      result = {
        value: a * (1 + b / 100),
        details: [a, (a * b) / 100],
        formula: 'A × (1 + B ÷ 100)',
      };
      break;
    case 'tax-remove': {
      const base = a / (1 + b / 100);
      result = {value: base, details: [a - base, a], formula: 'A ÷ (1 + B ÷ 100)'};
      break;
    }
    case 'discount':
      if (b > 100) return null;
      result = {
        value: a * (1 - b / 100),
        details: [(a * b) / 100, a],
        formula: 'A × (1 − B ÷ 100)',
      };
      break;
    case 'increase':
      result = {
        value: a * (1 + b / 100),
        details: [(a * b) / 100, a],
        formula: 'A × (1 + B ÷ 100)',
      };
      break;
    case 'original':
      if (b >= 100) return null;
      {
        const base = a / (1 - b / 100);
        result = {value: base, details: [base - a, a], formula: 'A ÷ (1 − B ÷ 100)'};
      }
      break;
    case 'portion':
      if (b === 0) return null;
      result = {value: (a / b) * 100, details: [a, b], formula: 'A ÷ B × 100'};
      break;
    case 'change':
      if (a === 0) return null;
      result = {value: ((b - a) / a) * 100, details: [b - a, b], formula: '(B − A) ÷ A × 100'};
      break;
    case 'profit':
      if (a === 0 || b === 0) return null;
      result = {
        value: b - a,
        details: [((b - a) / b) * 100, ((b - a) / a) * 100],
        formula: 'B − A',
      };
      break;
    case 'invoice':
      if (b > 100) return null;
      {
        const net = a * (1 - b / 100);
        result = {
          value: net * (1 + c / 100),
          details: [(a * b) / 100, net, (net * c) / 100],
          formula: 'A × (1 − B ÷ 100) × (1 + C ÷ 100)',
        };
      }
      break;
  }
  return [result.value, ...result.details].every((v) => Number.isFinite(v) && Math.abs(v) <= 1e12)
    ? result
    : null;
}
/** Small expression parser; intentionally excludes executable code and implicit percent semantics. */
export function evaluateArithmetic(raw: string): number | null {
  const source = raw
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776))
    .replace(/٫/g, '.')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/\s/g, '');
  if (!source || source.length > 200 || /[^\d.+*/()\-]/.test(source)) return null;
  let i = 0;
  function atom(): number {
    if (source[i] === '+') {
      i++;
      return atom();
    }
    if (source[i] === '-') {
      i++;
      return -atom();
    }
    if (source[i] === '(') {
      i++;
      const n = sum();
      if (source[i++] !== ')') throw Error();
      return n;
    }
    const match = source.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
    if (!match) throw Error();
    i += match[0].length;
    return Number(match[0]);
  }
  function product(): number {
    let n = atom();
    while (source[i] === '*' || source[i] === '/') {
      const op = source[i++],
        v = atom();
      if (op === '/' && v === 0) throw Error();
      n = op === '*' ? n * v : n / v;
    }
    return n;
  }
  function sum(): number {
    let n = product();
    while (source[i] === '+' || source[i] === '-') {
      const op = source[i++],
        v = product();
      n = op === '+' ? n + v : n - v;
    }
    return n;
  }
  try {
    const value = sum();
    return i === source.length && Number.isFinite(value) && Math.abs(value) <= 1e12 ? value : null;
  } catch {
    return null;
  }
}
