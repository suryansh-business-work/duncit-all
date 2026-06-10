import { describe, expect, it } from 'vitest';
import { locationSelectFormSchema, toLocationSelectInput } from './location-select.form';

describe('locationSelectFormSchema', () => {
  it('rejects empty city', async () => {
    const error = await locationSelectFormSchema.validate({ city: '', zone: 'HSR' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/city/i);
  });
  it('rejects empty zone', async () => {
    const error = await locationSelectFormSchema.validate({ city: 'Bengaluru', zone: '' }, { abortEarly: false }).catch((e) => e);
    expect(error.errors.join(' ')).toMatch(/zone/i);
  });
  it('accepts a valid selection', async () => {
    const parsed = await locationSelectFormSchema.validate({ city: 'Bengaluru', zone: 'HSR' });
    expect(parsed.city).toBe('Bengaluru');
  });
});

describe('toLocationSelectInput', () => {
  it('trims city and zone', () => {
    const input = toLocationSelectInput({ city: '  Bengaluru  ', zone: '  HSR  ' });
    expect(input.city).toBe('Bengaluru');
    expect(input.zone).toBe('HSR');
  });
});
