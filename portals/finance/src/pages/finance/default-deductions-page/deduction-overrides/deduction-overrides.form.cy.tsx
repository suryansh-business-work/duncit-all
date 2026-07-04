import { describe, expect, it } from 'vitest';
import { overrideSchema } from './deduction-overrides.form';

const messages = (result: ReturnType<typeof overrideSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((issue) => issue.message).join(' ');

describe('overrideSchema', () => {
  it('requires an entity to be picked', () => {
    const result = overrideSchema.safeParse({ entity_id: '', commission_pct: 10 });
    expect(messages(result)).toMatch(/pick one/i);
  });

  it('rejects a commission below 0', () => {
    const result = overrideSchema.safeParse({ entity_id: 'abc', commission_pct: -1 });
    expect(messages(result)).toMatch(/below 0/i);
  });

  it('rejects a commission above 100', () => {
    const result = overrideSchema.safeParse({ entity_id: 'abc', commission_pct: 101 });
    expect(messages(result)).toMatch(/exceed 100/i);
  });

  it('rejects a non-numeric commission', () => {
    const result = overrideSchema.safeParse({ entity_id: 'abc', commission_pct: '' });
    expect(messages(result)).toMatch(/percentage/i);
  });

  it('accepts 0 (inherit the global default)', () => {
    const result = overrideSchema.safeParse({ entity_id: 'abc', commission_pct: 0 });
    expect(result.success).toBe(true);
  });

  it('accepts a valid override', () => {
    const result = overrideSchema.safeParse({ entity_id: 'abc', commission_pct: 12.5 });
    expect(result.success).toBe(true);
  });
});
