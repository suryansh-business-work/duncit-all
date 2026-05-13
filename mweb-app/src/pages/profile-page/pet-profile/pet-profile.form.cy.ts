import { describe, expect, it } from 'vitest';
import { petProfileFormSchema, toPetProfileInput } from './pet-profile.form';

const base = {
  name: 'Buddy',
  species: 'DOG' as const,
  breed: 'Labrador',
  age_years: 3,
  bio: '',
  photo_url: '',
};

describe('petProfileFormSchema', () => {
  it('rejects empty name', async () => {
    const error = await petProfileFormSchema.validate({ ...base, name: '' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/name/i);
  });
  it('rejects invalid species', async () => {
    const error = await petProfileFormSchema.validate({ ...base, species: 'DINO' as any }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/species/i);
  });
  it('rejects negative age', async () => {
    const error = await petProfileFormSchema.validate({ ...base, age_years: -1 }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/age/i);
  });
  it('rejects age over 40', async () => {
    const error = await petProfileFormSchema.validate({ ...base, age_years: 100 }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/age/i);
  });
  it('accepts valid input', async () => {
    await petProfileFormSchema.validate(base);
  });
});

describe('toPetProfileInput', () => {
  it('nullifies empty optional fields', () => {
    const input = toPetProfileInput({ ...base, breed: '', bio: '', photo_url: '' });
    expect(input.breed).toBeNull();
    expect(input.bio).toBeNull();
    expect(input.photo_url).toBeNull();
  });
});
