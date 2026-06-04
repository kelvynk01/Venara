import { describe, expect, it } from 'vitest';
import { applyLexicon } from './index';

describe('applyLexicon', () => {
  it('returns text unchanged when lexicon is empty/undefined', () => {
    expect(applyLexicon('Hello Venara', undefined)).toBe('Hello Venara');
    expect(applyLexicon('Hello Venara', [])).toBe('Hello Venara');
  });

  it('substitutes a term with its spoken form, case-insensitively', () => {
    const out = applyLexicon('Open Venara then venara again', [
      { term: 'Venara', say: 'Vuh-nar-uh' },
    ]);
    expect(out).toBe('Open Vuh-nar-uh then Vuh-nar-uh again');
  });

  it('escapes regex special characters in the term', () => {
    const out = applyLexicon('Use C++ today', [{ term: 'C++', say: 'C plus plus' }]);
    expect(out).toBe('Use C plus plus today');
  });

  it('treats $ in the replacement literally (no back-reference injection)', () => {
    // Without escaping, "$&" would re-insert the matched text.
    const out = applyLexicon('Price PLAN', [{ term: 'PLAN', say: '$& deal $1' }]);
    expect(out).toBe('Price $& deal $1');
  });
});
