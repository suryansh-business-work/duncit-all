import { describe, expect, it } from 'vitest';
import { estimateTokens } from '../../src/utils/estimate-tokens';

describe('estimateTokens', () => {
  it('returns 0 for empty or whitespace-only input', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('   \n\t ')).toBe(0);
  });

  it('treats a nullish input as empty', () => {
    expect(estimateTokens(undefined as unknown as string)).toBe(0);
  });

  it('estimates at least one token for tiny content', () => {
    expect(estimateTokens('hi')).toBe(1);
  });

  it('averages the char and word heuristics and rounds up', () => {
    // "one two three four" → 18 chars, 4 words.
    // ceil((18/4 + 4/0.75) / 2) = ceil((4.5 + 5.333) / 2) = ceil(4.916) = 5
    expect(estimateTokens('one two three four')).toBe(5);
  });

  it('collapses runs of whitespace when counting words', () => {
    expect(estimateTokens('alpha    beta')).toBe(estimateTokens('alpha beta'));
  });
});
