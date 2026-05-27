import { describe, expect, it } from 'vitest';
import { getNested } from '@/forms/getNested';

describe('getNested', () => {
  it('reads a top-level key', () => {
    expect(getNested({ foo: 1 }, 'foo')).toBe(1);
  });

  it('reads a dotted nested path', () => {
    expect(getNested({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
  });

  it('reads bracketed array indices', () => {
    const value = getNested({ contacts: [{ name: 'Asha' }, { name: 'Ravi' }] }, 'contacts[1].name');
    expect(value).toBe('Ravi');
  });

  it('returns undefined for missing intermediate segments', () => {
    expect(getNested({ a: { b: null } }, 'a.b.c')).toBeUndefined();
    expect(getNested({}, 'foo.bar')).toBeUndefined();
  });

  it('returns undefined for non-object roots', () => {
    expect(getNested(null, 'foo')).toBeUndefined();
    expect(getNested(undefined, 'foo')).toBeUndefined();
    expect(getNested(42, 'foo')).toBeUndefined();
  });

  it('handles mixed dot + bracket notation', () => {
    const value = getNested(
      { sections: [{ rows: [{ ok: true }] }] },
      'sections[0].rows.0.ok'
    );
    expect(value).toBe(true);
  });
});
