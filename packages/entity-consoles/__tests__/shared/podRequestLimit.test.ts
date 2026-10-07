import { describe, expect, it } from 'vitest';
import {
  podRequestOverrideField,
  podRequestOverrideInput,
  podRequestOverrideText,
} from '../../src/shared/podRequestLimit';

/**
 * The admin override of a partner's monthly Pod Request cap: typed as text in
 * the venue and host editors, sent as `Int | null`. Empty must mean "no
 * override" — never 0, which would stop the partner sending any request.
 */
const t = (key: string) => key;
const field = podRequestOverrideField(t);

function messageFor(text: string): string {
  const result = field.safeParse(text);
  return result.success ? '' : (result.error.issues[0]?.message ?? '');
}

describe('podRequestOverrideField', () => {
  it('accepts an empty box (no override) and whole numbers 0 to 1000', () => {
    for (const text of ['', '0', '25', '1000']) {
      expect(field.safeParse(text).success).toBe(true);
    }
  });

  it('refuses what the server would refuse, with the override message', () => {
    for (const text of ['-1', '1001', '2.5', 'ten', '   ']) {
      expect(messageFor(text)).toBe('podRequests.overrideInvalid');
    }
  });

  it('keeps the value as typed — the form holds text, not the parsed number', () => {
    const result = field.safeParse('40');
    expect(result.success && result.data).toBe('40');
  });
});

describe('podRequestOverrideInput', () => {
  it('clears the override for an empty box', () => {
    expect(podRequestOverrideInput(t, '')).toBeNull();
  });

  it('sends a number for a typed limit, including an explicit 0', () => {
    expect(podRequestOverrideInput(t, '25')).toBe(25);
    expect(podRequestOverrideInput(t, '0')).toBe(0);
  });

  it('throws on text the field would have refused, rather than sending a guess', () => {
    expect(() => podRequestOverrideInput(t, '1001')).toThrow();
  });
});

describe('podRequestOverrideText', () => {
  it('shows an unset override as an empty box', () => {
    expect(podRequestOverrideText(null)).toBe('');
    expect(podRequestOverrideText(undefined)).toBe('');
  });

  it('shows a set override, 0 included, as its digits', () => {
    expect(podRequestOverrideText(0)).toBe('0');
    expect(podRequestOverrideText(120)).toBe('120');
  });
});
