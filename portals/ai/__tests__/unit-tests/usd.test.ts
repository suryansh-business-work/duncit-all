import { describe, expect, it } from 'vitest';
import { usd, tokens } from '../../src/lib/usd';

/**
 * OpenAI bills in USD and the amounts on these pages span six orders of
 * magnitude: one moderation scan costs a fraction of a cent, a month of them
 * costs real money. A fixed precision breaks at one end or the other, so the
 * precision follows the number — which is exactly the thing to pin.
 */
describe('usd', () => {
  it('writes a plain zero rather than a padded one', () => {
    expect(usd(0)).toBe('$0');
  });

  it('gives a sub-cent amount six decimals, so a scan is not "$0.00"', () => {
    expect(usd(0.0004)).toBe('$0.000400');
  });

  it('gives a sub-dollar amount four decimals', () => {
    expect(usd(0.5)).toBe('$0.5000');
  });

  it('gives a real amount two decimals, grouped', () => {
    expect(usd(1.24)).toBe('$1.24');
    expect(usd(1234.5)).toBe('$1,234.50');
  });

  it('treats a refund the same way, by magnitude', () => {
    // The thresholds are on the ABSOLUTE value; a credit is still money.
    expect(usd(-0.0004)).toContain('0.000400');
    expect(usd(-0.5)).toContain('0.5000');
  });

  it('reads anything unusable as zero rather than NaN', () => {
    expect(usd(Number.NaN)).toBe('$0');
    expect(usd(undefined as unknown as number)).toBe('$0');
  });
});

describe('tokens', () => {
  it('groups a count, because it is read as a magnitude', () => {
    expect(tokens(515_000)).toBe((515_000).toLocaleString());
  });

  it('reads a missing count as zero', () => {
    expect(tokens(0)).toBe('0');
    expect(tokens(undefined as unknown as number)).toBe('0');
  });
});
