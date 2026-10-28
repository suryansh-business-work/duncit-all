import { describe, expect, it } from 'vitest';
import { createTranslator } from '@duncit/i18n';
import { WEB_FALLBACK } from '../../../../../shared/i18n';
import { makePaymentReferenceSchema } from '../../../../pages/ticket/payment-panel';

const { t } = createTranslator({ locale: 'en-IN', fallback: WEB_FALLBACK });
const schema = makePaymentReferenceSchema(t);
const LENGTH = 'A transaction reference is 6 to 40 characters';

const messages = (input: { reference: string; note: string }): string[] => {
  const result = schema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('makePaymentReferenceSchema', () => {
  it('accepts a 12-digit UTR and trims what was pasted around it', () => {
    expect(schema.parse({ reference: '  412345678901  ', note: '  paid from mum’s account ' })).toEqual({ reference: '412345678901', note: 'paid from mum’s account' });
  });

  it('accepts the shortest and longest references allowed', () => {
    expect(messages({ reference: 'A1B2C3', note: '' })).toEqual([]);
    expect(messages({ reference: 'x'.repeat(40), note: '' })).toEqual([]);
  });

  it('refuses a reference shorter than 6 characters, counting after the trim', () => {
    expect(messages({ reference: '12345', note: '' })).toEqual([LENGTH]);
    expect(messages({ reference: '   12345   ', note: '' })).toEqual([LENGTH]);
    expect(messages({ reference: '', note: '' })).toEqual([LENGTH]);
  });

  it('refuses a reference longer than 40 characters', () => {
    expect(messages({ reference: 'x'.repeat(41), note: '' })).toEqual([LENGTH]);
  });

  it('keeps the note to 200 characters', () => {
    expect(messages({ reference: '412345678901', note: 'n'.repeat(200) })).toEqual([]);
    expect(messages({ reference: '412345678901', note: 'n'.repeat(201) })).toEqual(['Keep this to 200 characters or fewer']);
  });
});
