import { describe, it, expect } from 'vitest';
import { mergeSx } from '../src/mergeSx';

describe('mergeSx', () => {
  it('returns the defaults untouched when no override is given', () => {
    const defaults = { p: 1 };
    expect(mergeSx(defaults)).toBe(defaults);
  });

  it('merges a plain default with a plain override (both non-array)', () => {
    const result = mergeSx({ p: 1 }, { m: 2 });
    expect(result).toEqual([{ p: 1 }, { m: 2 }]);
  });

  it('merges array default with array override, later entries winning', () => {
    const result = mergeSx([{ p: 1 }], [{ p: 2 }]);
    expect(result).toEqual([{ p: 1 }, { p: 2 }]);
  });
});
