import { describe, expect, it } from 'vitest';
import {
  buildBenefitValueFields,
  membershipBenefitFormDefaults,
  membershipBenefitFormSchema,
  toMembershipBenefitInput,
  type MembershipBenefitFormValues,
} from './membership-benefit.form';

const valid = (over: Partial<MembershipBenefitFormValues> = {}): MembershipBenefitFormValues => ({
  ...membershipBenefitFormDefaults,
  group: 'Getting a spot',
  label: 'Early booking window',
  sort_order: 1,
  values: [{ plan_key: 'gold-tier', value: '12h' }],
  ...over,
});

const errorsOf = (values: unknown): string[] => {
  const result = membershipBenefitFormSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('membershipBenefitFormSchema — group', () => {
  it('requires a non-blank group', () => {
    expect(errorsOf(valid({ group: '  ' }))).toContain('Section is required');
  });

  it('rejects a group longer than 60 characters', () => {
    expect(errorsOf(valid({ group: 'a'.repeat(61) }))).toContain('Section must be 60 characters or fewer');
  });

  it('accepts a valid group', () => {
    expect(errorsOf(valid({ group: 'Getting a spot' }))).toEqual([]);
  });
});

describe('membershipBenefitFormSchema — label', () => {
  it('requires a non-blank label', () => {
    expect(errorsOf(valid({ label: '  ' }))).toContain('Benefit is required');
  });

  it('rejects a label longer than 120 characters', () => {
    expect(errorsOf(valid({ label: 'a'.repeat(121) }))).toContain('Benefit must be 120 characters or fewer');
  });
});

describe('membershipBenefitFormSchema — values', () => {
  it('defaults values to an empty array when omitted', () => {
    const parsed = membershipBenefitFormSchema.parse({
      group: 'Getting a spot',
      label: 'Early booking window',
      sort_order: 0,
    });
    expect(parsed.values).toEqual([]);
  });

  it('requires each value cell to carry a plan_key', () => {
    expect(errorsOf(valid({ values: [{ plan_key: '  ', value: 'Free' }] }))).not.toEqual([]);
  });

  it('rejects a cell value longer than 60 characters', () => {
    expect(
      errorsOf(valid({ values: [{ plan_key: 'gold-tier', value: 'a'.repeat(61) }] }))
    ).toContain('Each cell must be 60 characters or fewer');
  });

  it('defaults a cell value to empty string when omitted', () => {
    const parsed = membershipBenefitFormSchema.parse(
      valid({ values: [{ plan_key: 'gold-tier' } as never] })
    );
    expect(parsed.values[0].value).toBe('');
  });
});

describe('membershipBenefitFormSchema — sort_order', () => {
  it('requires a whole number', () => {
    expect(errorsOf(valid({ sort_order: 1.5 }))).toContain('Sort order must be a whole number');
  });

  it('rejects a negative sort order', () => {
    expect(errorsOf(valid({ sort_order: -1 }))).toContain('Sort order must be 0 or greater');
  });

  it('rejects a sort order above 999', () => {
    expect(errorsOf(valid({ sort_order: 1000 }))).toContain('Sort order must be 999 or fewer');
  });

  it('coerces a numeric string', () => {
    expect(membershipBenefitFormSchema.parse(valid({ sort_order: '7' as unknown as number })).sort_order).toBe(7);
  });
});

describe('membershipBenefitFormSchema — is_active', () => {
  it('defaults to true when omitted', () => {
    expect(
      membershipBenefitFormSchema.parse({ group: 'g', label: 'l', sort_order: 0 }).is_active
    ).toBe(true);
  });

  it('keeps an explicit false', () => {
    expect(membershipBenefitFormSchema.parse(valid({ is_active: false })).is_active).toBe(false);
  });
});

describe('toMembershipBenefitInput', () => {
  it('maps each value cell to plan_key/value only', () => {
    const input = toMembershipBenefitInput(
      valid({ values: [{ plan_key: 'gold-tier', value: '12h' }, { plan_key: 'silver-tier', value: '' }] })
    );
    expect(input.values).toEqual([
      { plan_key: 'gold-tier', value: '12h' },
      { plan_key: 'silver-tier', value: '' },
    ]);
  });

  it('carries group, label, sort_order and is_active through', () => {
    const input = toMembershipBenefitInput(valid({ group: 'Getting a spot', label: 'Early booking window', sort_order: 3 }));
    expect(input).toMatchObject({ group: 'Getting a spot', label: 'Early booking window', sort_order: 3, is_active: true });
  });

  it('falls back sort_order to 0 when it casts to a falsy number', () => {
    // sort_order is already validated non-negative by the schema; this proves
    // the `Number(cast.sort_order) || 0` guard behaves for the 0 case itself.
    const input = toMembershipBenefitInput(valid({ sort_order: 0 }));
    expect(input.sort_order).toBe(0);
  });
});

describe('buildBenefitValueFields', () => {
  it('builds one field per plan key, in plan order', () => {
    const fields = buildBenefitValueFields(['gold-tier', 'silver-tier'], [{ plan_key: 'silver-tier', value: '10%' }]);
    expect(fields).toEqual([
      { plan_key: 'gold-tier', value: '' },
      { plan_key: 'silver-tier', value: '10%' },
    ]);
  });

  it('drops an existing value whose plan is no longer in the plan list', () => {
    const fields = buildBenefitValueFields(['gold-tier'], [{ plan_key: 'retired-tier', value: 'Free' }]);
    expect(fields).toEqual([{ plan_key: 'gold-tier', value: '' }]);
  });

  it('returns an empty array when there are no plans', () => {
    expect(buildBenefitValueFields([], [{ plan_key: 'gold-tier', value: 'Free' }])).toEqual([]);
  });
});

describe('membershipBenefitFormDefaults', () => {
  it('is a fully blank, active-by-default row with no value cells', () => {
    expect(membershipBenefitFormDefaults).toEqual({
      group: '',
      label: '',
      values: [],
      sort_order: 0,
      is_active: true,
    });
  });
});
