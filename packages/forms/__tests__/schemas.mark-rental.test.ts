import { describe, expect, it } from 'vitest';
import { makeMarkRentalSchema } from '../src/schemas';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key}:${JSON.stringify(options.vars)}` : key;
const schema = makeMarkRentalSchema(t, 300);

const issues = (values: unknown) => {
  const result = schema.safeParse(values);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}:${i.message}`);
};

describe('makeMarkRentalSchema', () => {
  it('takes a return with nothing else to say', () => {
    expect(issues({ outcome: 'RETURNED', damage_claim: '', note: '' })).toEqual([]);
  });

  it('takes a damage claim up to the deposit, with what was damaged', () => {
    expect(issues({ outcome: 'DAMAGED', damage_claim: '300', note: 'Cracked frame' })).toEqual([]);
  });

  it('refuses a claim of nothing, or above the deposit, and a claim with no reason', () => {
    expect(issues({ outcome: 'DAMAGED', damage_claim: '0', note: 'Cracked' })).toEqual([
      'damage_claim:venueRentals.mark.claimInvalid:{"max":300}',
    ]);
    expect(issues({ outcome: 'DAMAGED', damage_claim: 301, note: 'Cracked' })).toEqual([
      'damage_claim:venueRentals.mark.claimInvalid:{"max":300}',
    ]);
    expect(issues({ outcome: 'DAMAGED', damage_claim: '50', note: '  ' })).toEqual(['note:venueRentals.mark.noteRequired']);
  });
});
