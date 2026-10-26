import { describe, expect, it } from 'vitest';
import {
  makeRentalSettingsSchema,
  RENTAL_SETTINGS_LIMITS,
} from '../../src/pages/finance/rented-items-settings-page/rental-settings-form/rental-settings.schema';

/** Echoes the key and its variables, so each assertion names the exact message and bounds shown. */
const t = ((key: string, options?: { vars?: Record<string, unknown> }) =>
  options?.vars ? `${key} ${JSON.stringify(options.vars)}` : key) as Parameters<typeof makeRentalSettingsSchema>[0];

const schema = makeRentalSettingsSchema(t);

const valid = {
  enabled: true,
  terms_html: '<p>Return items clean.</p>',
  commission_pct: 10,
  rent_refundable_on_backout: true,
  deposit_refundable: false,
  booking_cutoff_hours: 24,
  deposit_auto_release_days: 7,
};

const messagesFor = (over: Record<string, unknown>) => {
  const parsed = schema.safeParse({ ...valid, ...over });
  return parsed.success ? [] : parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
};

describe('rental settings limits', () => {
  it('are the bounds the server enforces', () => {
    expect(RENTAL_SETTINGS_LIMITS).toEqual({
      commission: { min: 0, max: 100 },
      cutoffHours: { min: 0, max: 168 },
      autoReleaseDays: { min: 1, max: 60 },
      termsMax: 50_000,
    });
  });
});

describe('makeRentalSettingsSchema', () => {
  it('takes the stored settings as they are and coerces typed numbers', () => {
    const parsed = schema.parse({
      ...valid,
      commission_pct: '12.5',
      booking_cutoff_hours: '48',
      deposit_auto_release_days: '30',
    });

    expect(parsed).toMatchObject({ commission_pct: 12.5, booking_cutoff_hours: 48, deposit_auto_release_days: 30 });
  });

  it('accepts the commission at both ends of its range and refuses a step outside it', () => {
    expect(messagesFor({ commission_pct: 0 })).toEqual([]);
    expect(messagesFor({ commission_pct: 100 })).toEqual([]);
    const expected = 'commission_pct: finance.rentedItems.commissionInvalid {"min":0,"max":100}';
    expect(messagesFor({ commission_pct: -0.5 })).toEqual([expected]);
    expect(messagesFor({ commission_pct: 100.5 })).toEqual([expected]);
  });

  it('refuses a commission that is not a number', () => {
    expect(messagesFor({ commission_pct: 'abc' })).toEqual([
      'commission_pct: finance.rentedItems.commissionInvalid {"min":0,"max":100}',
    ]);
  });

  it('takes whole booking-cutoff hours from 0 to 168 only', () => {
    expect(messagesFor({ booking_cutoff_hours: 0 })).toEqual([]);
    expect(messagesFor({ booking_cutoff_hours: 168 })).toEqual([]);
    const expected = 'booking_cutoff_hours: finance.rentedItems.cutoffInvalid {"min":0,"max":168}';
    expect(messagesFor({ booking_cutoff_hours: 169 })).toEqual([expected]);
    expect(messagesFor({ booking_cutoff_hours: -1 })).toEqual([expected]);
    expect(messagesFor({ booking_cutoff_hours: 1.5 })).toEqual([expected]);
    expect(messagesFor({ booking_cutoff_hours: 'soon' })).toEqual([expected]);
  });

  it('takes whole auto-release days from 1 to 60 only, so a deposit is never held for ever or released at once', () => {
    expect(messagesFor({ deposit_auto_release_days: 1 })).toEqual([]);
    expect(messagesFor({ deposit_auto_release_days: 60 })).toEqual([]);
    const expected = 'deposit_auto_release_days: finance.rentedItems.autoReleaseInvalid {"min":1,"max":60}';
    expect(messagesFor({ deposit_auto_release_days: 0 })).toEqual([expected]);
    expect(messagesFor({ deposit_auto_release_days: 61 })).toEqual([expected]);
    expect(messagesFor({ deposit_auto_release_days: 2.5 })).toEqual([expected]);
  });

  it('caps the terms at 50,000 characters', () => {
    expect(messagesFor({ terms_html: 'x'.repeat(50_000) })).toEqual([]);
    expect(messagesFor({ terms_html: 'x'.repeat(50_001) })).toEqual([
      'terms_html: finance.rentedItems.termsTooLong',
    ]);
  });
});
