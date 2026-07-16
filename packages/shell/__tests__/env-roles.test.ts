import { describe, it, expect } from 'vitest';
import { parseEnvRoles } from '../src/lib/env-roles';

describe('parseEnvRoles', () => {
  it('splits a CSV string, trimming and dropping empties', () => {
    expect(parseEnvRoles('A, B ,, C ')).toEqual(['A', 'B', 'C']);
  });

  it('falls back when the value is not a string', () => {
    expect(parseEnvRoles(['X'], ['DEF'])).toEqual(['DEF']);
    expect(parseEnvRoles(null, ['DEF'])).toEqual(['DEF']);
    expect(parseEnvRoles(undefined, ['DEF'])).toEqual(['DEF']);
  });

  it('falls back when the string yields no roles', () => {
    expect(parseEnvRoles('   , ,', ['DEF'])).toEqual(['DEF']);
  });

  it('defaults the fallback to an empty array', () => {
    expect(parseEnvRoles('')).toEqual([]);
  });

  it('prefers parsed roles over the fallback', () => {
    expect(parseEnvRoles('ADMIN', ['DEF'])).toEqual(['ADMIN']);
  });
});
