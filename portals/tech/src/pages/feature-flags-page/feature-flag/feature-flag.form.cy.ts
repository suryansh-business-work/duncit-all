import { describe, expect, it } from 'vitest';
import { featureFlagFormSchema, toFeatureFlagInput } from './feature-flag.form';

const base = {
  key: 'new-onboarding',
  name: 'New Onboarding',
  description: '',
  is_enabled: false,
};

const firstError = (result: ReturnType<typeof featureFlagFormSchema.safeParse>) =>
  result.success ? '' : result.error.issues.map((i) => i.message).join(' ');

describe('featureFlagFormSchema', () => {
  it('rejects key with spaces', () => {
    expect(firstError(featureFlagFormSchema.safeParse({ ...base, key: 'new flag' }))).toMatch(/key/i);
  });
  it('rejects empty name', () => {
    expect(firstError(featureFlagFormSchema.safeParse({ ...base, name: '' }))).toMatch(/name/i);
  });
  it('accepts valid input', () => {
    expect(featureFlagFormSchema.safeParse(base).success).toBe(true);
  });
});

describe('toFeatureFlagInput', () => {
  it('nullifies empty description', () => {
    expect(toFeatureFlagInput(base).description).toBeNull();
  });
});
