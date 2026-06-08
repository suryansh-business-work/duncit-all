import { estimateTokens } from '@services/ai/token-estimate';

describe('estimateTokens', () => {
  it('returns 0 for empty or whitespace-only text', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('   \n  ')).toBe(0);
  });

  it('is at least 1 for any non-empty text and grows with length', () => {
    expect(estimateTokens('hi')).toBeGreaterThanOrEqual(1);
    expect(estimateTokens('a longer prompt body with several words')).toBeGreaterThan(estimateTokens('short'));
  });
});
