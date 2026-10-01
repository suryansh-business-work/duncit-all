import { describe, expect, it } from 'vitest';
import { petProfileFormSchema, toPetProfileInput } from './pet-profile.form';

const errorText = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message).join(' ');

const base = {
  name: 'Buddy',
  species: 'DOG' as const,
  breed: 'Labrador',
  age_years: 3,
  bio: '',
  photo_url: '',
};

describe('petProfileFormSchema', () => {
  it('rejects empty name', () => {
    expect(errorText(petProfileFormSchema.safeParse({ ...base, name: '' }))).toMatch(/name/i);
  });
  it('rejects invalid species', () => {
    expect(errorText(petProfileFormSchema.safeParse({ ...base, species: 'DINO' as any }))).toMatch(/species/i);
  });
  it('rejects negative age', () => {
    expect(errorText(petProfileFormSchema.safeParse({ ...base, age_years: -1 }))).toMatch(/age/i);
  });
  it('rejects age over 40', () => {
    expect(errorText(petProfileFormSchema.safeParse({ ...base, age_years: 100 }))).toMatch(/age/i);
  });
  it('accepts valid input', () => {
    expect(petProfileFormSchema.safeParse(base).success).toBe(true);
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
