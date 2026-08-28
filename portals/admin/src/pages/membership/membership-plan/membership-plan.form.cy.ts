import { describe, expect, it } from 'vitest';
import {
  membershipPlanFormDefaults,
  membershipPlanFormSchema,
  toMembershipPlanInput,
  toMembershipPlanUpdateInput,
  type MembershipPlanFormValues,
} from './membership-plan.form';

const valid = (over: Partial<MembershipPlanFormValues> = {}): MembershipPlanFormValues => ({
  ...membershipPlanFormDefaults,
  key: 'gold-tier',
  name: 'Gold Tier',
  sort_order: 1,
  ...over,
});

const errorsOf = (values: unknown): string[] => {
  const result = membershipPlanFormSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('membershipPlanFormSchema — key', () => {
  it('requires a non-blank key', () => {
    expect(errorsOf(valid({ key: '  ' }))).toContain('Key is required');
  });

  it('rejects a key longer than 40 characters', () => {
    expect(errorsOf(valid({ key: 'a'.repeat(41) }))).toContain('Key must be 40 characters or fewer');
  });

  it('rejects a key with uppercase or spaces', () => {
    const errors = errorsOf(valid({ key: 'Gold Tier' }));
    expect(errors).toContain('Key may contain lowercase letters, digits, dashes and underscores');
  });

  it('accepts a valid lowercase/dash/underscore key', () => {
    expect(errorsOf(valid({ key: 'gold_tier-2' }))).toEqual([]);
  });
});

describe('membershipPlanFormSchema — name', () => {
  it('requires a non-blank name', () => {
    expect(errorsOf(valid({ name: '  ' }))).toContain('Name is required');
  });

  it('rejects a name longer than 60 characters', () => {
    expect(errorsOf(valid({ name: 'a'.repeat(61) }))).toContain('Name must be 60 characters or fewer');
  });
});

describe('membershipPlanFormSchema — optional text fields', () => {
  it('defaults every optional text field to empty string when omitted', () => {
    const { tagline, price_label, price_note, badge_label, cta_label } = membershipPlanFormSchema.parse({
      key: 'gold-tier',
      name: 'Gold Tier',
      sort_order: 0,
    });
    expect({ tagline, price_label, price_note, badge_label, cta_label }).toEqual({
      tagline: '',
      price_label: '',
      price_note: '',
      badge_label: '',
      cta_label: '',
    });
  });

  it('enforces max length on tagline, price_label, price_note, badge_label and cta_label', () => {
    expect(errorsOf(valid({ tagline: 'a'.repeat(201) }))).toContain('Tagline must be 200 characters or fewer');
    expect(errorsOf(valid({ price_label: 'a'.repeat(41) }))).toContain('Price must be 40 characters or fewer');
    expect(errorsOf(valid({ price_note: 'a'.repeat(81) }))).toContain('Note must be 80 characters or fewer');
    expect(errorsOf(valid({ badge_label: 'a'.repeat(41) }))).toContain('Badge must be 40 characters or fewer');
    expect(errorsOf(valid({ cta_label: 'a'.repeat(41) }))).toContain('Button text must be 40 characters or fewer');
  });
});

describe('membershipPlanFormSchema — accent_color', () => {
  it('accepts a blank accent color', () => {
    expect(errorsOf(valid({ accent_color: '' }))).toEqual([]);
  });

  it('accepts a 3-digit and a 6-digit hex color', () => {
    expect(errorsOf(valid({ accent_color: '#abc' }))).toEqual([]);
    expect(errorsOf(valid({ accent_color: '#B4532A' }))).toEqual([]);
  });

  it('rejects an invalid color string', () => {
    expect(errorsOf(valid({ accent_color: 'blue' }))).toContain(
      'Use a hex colour like #B4532A, or leave blank'
    );
  });
});

describe('membershipPlanFormSchema — sort_order', () => {
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
    expect(membershipPlanFormSchema.parse(valid({ sort_order: '5' as unknown as number })).sort_order).toBe(5);
  });
});

describe('membershipPlanFormSchema — is_active', () => {
  it('defaults to true when omitted', () => {
    expect(
      membershipPlanFormSchema.parse({ key: 'gold-tier', name: 'Gold Tier', sort_order: 0 }).is_active
    ).toBe(true);
  });

  it('keeps an explicit false', () => {
    expect(membershipPlanFormSchema.parse(valid({ is_active: false })).is_active).toBe(false);
  });
});

describe('toMembershipPlanInput / toMembershipPlanUpdateInput', () => {
  it('the create payload carries the key', () => {
    const input = toMembershipPlanInput(valid({ key: 'gold-tier', name: 'Gold Tier' }));
    expect(input).toMatchObject({ key: 'gold-tier', name: 'Gold Tier' });
  });

  it('the update payload never carries the key', () => {
    const input = toMembershipPlanUpdateInput(valid());
    expect(input).not.toHaveProperty('key');
    expect(input).toEqual({
      name: 'Gold Tier',
      tagline: '',
      price_label: '',
      price_note: '',
      badge_label: '',
      accent_color: '',
      cta_label: '',
      sort_order: 1,
      is_active: true,
    });
  });

  it('falls back sort_order to 0 when it casts to a falsy number', () => {
    // sort_order is already validated non-negative by the schema; this proves
    // the `Number(cast.sort_order) || 0` guard behaves for the 0 case itself.
    const input = toMembershipPlanUpdateInput(valid({ sort_order: 0 }));
    expect(input.sort_order).toBe(0);
  });
});

describe('membershipPlanFormDefaults', () => {
  it('is a fully blank, active-by-default plan', () => {
    expect(membershipPlanFormDefaults).toEqual({
      key: '',
      name: '',
      tagline: '',
      price_label: '',
      price_note: '',
      badge_label: '',
      accent_color: '',
      cta_label: '',
      sort_order: 0,
      is_active: true,
    });
  });
});
