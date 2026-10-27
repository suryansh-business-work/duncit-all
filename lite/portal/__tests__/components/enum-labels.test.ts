import { describe, expect, it } from 'vitest';
import { createTranslator } from '@duncit/i18n';
import { PORTAL_FALLBACK } from '../../../shared/i18n';
import {
  EMAIL_STATUS_COLORS,
  EMAIL_STATUS_KEYS,
  enumLabel,
  enumOptions,
  EVENT_STATUS_COLORS,
  EVENT_STATUS_KEYS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_KEYS,
  REGISTRATION_STATUS_COLORS,
  REGISTRATION_STATUS_KEYS,
  VISIBILITY_COLORS,
  VISIBILITY_KEYS,
} from '../../components/enum-labels';
import { portalT } from '../test-utils';

const { has } = createTranslator({ locale: 'en-IN', fallback: PORTAL_FALLBACK });

const MAPS = [
  ['event status', EVENT_STATUS_KEYS, EVENT_STATUS_COLORS],
  ['visibility', VISIBILITY_KEYS, VISIBILITY_COLORS],
  ['registration status', REGISTRATION_STATUS_KEYS, REGISTRATION_STATUS_COLORS],
  ['payment status', PAYMENT_STATUS_KEYS, PAYMENT_STATUS_COLORS],
  ['email status', EMAIL_STATUS_KEYS, EMAIL_STATUS_COLORS],
] as const;

describe('enum label maps', () => {
  it.each(MAPS)('every %s key exists in the console bundle and has a colour', (_name, keys, colors) => {
    for (const [value, key] of Object.entries(keys)) {
      expect(has(key), key).toBe(true);
      expect(colors[value], value).toBeDefined();
    }
  });

  it('colours the outcomes by meaning', () => {
    expect(EVENT_STATUS_COLORS.CANCELLED).toBe('error');
    expect(REGISTRATION_STATUS_COLORS.CONFIRMED).toBe('success');
    expect(PAYMENT_STATUS_COLORS.REJECTED).toBe('error');
    expect(EMAIL_STATUS_COLORS.FAILED).toBe('error');
  });
});

describe('enumOptions', () => {
  it('lists every value in declaration order with its translated label', () => {
    expect(enumOptions(EVENT_STATUS_KEYS, portalT)).toEqual([
      { value: 'DRAFT', label: 'Draft' },
      { value: 'PUBLISHED', label: 'Published' },
      { value: 'CANCELLED', label: 'Cancelled' },
    ]);
  });

  it('uses the shared status copy, so CONFIRMED reads as Going', () => {
    const options = enumOptions(REGISTRATION_STATUS_KEYS, portalT);
    expect(options).toHaveLength(6);
    expect(options.find((option) => option.value === 'CONFIRMED')?.label).toBe('Going');
  });
});

describe('enumLabel', () => {
  it('translates one value for sorting and export', () => {
    expect(enumLabel(PAYMENT_STATUS_KEYS, 'NOT_REQUIRED', portalT)).toBe('Free');
    expect(enumLabel(EMAIL_STATUS_KEYS, 'SKIPPED', portalT)).toBe('Skipped');
    expect(enumLabel(VISIBILITY_KEYS, 'UNLISTED', portalT)).toBe('Unlisted');
  });
});
