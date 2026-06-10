import { describe, expect, it } from 'vitest';
import { featureFlagFormSchema, toFeatureFlagInput } from './feature-flag.form';

const base = {
  key: 'new-onboarding',
  name: 'New Onboarding',
  description: '',
  is_enabled: false,
};

describe('featureFlagFormSchema', () => {
  it('rejects key with spaces', async () => {
    const error = await featureFlagFormSchema.validate({ ...base, key: 'new flag' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/key/i);
  });
  it('rejects empty name', async () => {
    const error = await featureFlagFormSchema.validate({ ...base, name: '' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/name/i);
  });
  it('accepts valid input', async () => {
    await expect(featureFlagFormSchema.validate(base)).resolves.toBeTruthy();
  });
});

describe('toFeatureFlagInput', () => {
  it('nullifies empty description', () => {
    expect(toFeatureFlagInput(base).description).toBeNull();
  });
});
