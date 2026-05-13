import { describe, expect, it } from 'vitest';
import { policyFormSchema, stripHtml, toPolicyInput } from './policy.form';

const base = {
  slug: 'privacy',
  title: 'Privacy Policy',
  body: 'We care about your privacy and protect your data with the highest standards.',
  sort_order: 0,
  is_published: false,
};

describe('policyFormSchema', () => {
  it('rejects slug with spaces', async () => {
    const error = await policyFormSchema.validate({ ...base, slug: 'priv acy' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/slug/i);
  });
  it('rejects short body', async () => {
    const error = await policyFormSchema.validate({ ...base, body: 'short' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/body/i);
  });
  it('accepts valid input', async () => {
    await policyFormSchema.validate(base);
  });
});

describe('stripHtml', () => {
  it('removes tags', () => {
    expect(stripHtml('<p>hello</p>')).toBe('hello');
  });
});

describe('toPolicyInput', () => {
  it('throws when body is just empty html', () => {
    expect(() => toPolicyInput({ ...base, body: '<p></p><p>   </p>' })).toThrow(/body/i);
  });
});
