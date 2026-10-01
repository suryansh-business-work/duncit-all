import { describe, expect, it } from 'vitest';
import { locationSelectFormSchema, toLocationSelectInput } from './location-select.form';

const errorText = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message).join(' ');

describe('locationSelectFormSchema', () => {
  it('rejects empty city', () => {
    expect(errorText(locationSelectFormSchema.safeParse({ city: '', zone: 'HSR' }))).toMatch(/city/i);
  });
  it('rejects empty zone', () => {
    expect(errorText(locationSelectFormSchema.safeParse({ city: 'Bengaluru', zone: '' }))).toMatch(/zone/i);
  });
  it('accepts a valid selection', () => {
    const parsed = locationSelectFormSchema.parse({ city: 'Bengaluru', zone: 'HSR' });
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
