import {
  MAX_VETTED_PATTERN,
  escapeRegexLiteral,
  isVettedPattern,
  vetRegexPattern,
} from '../../vet-regex';

/**
 * A console-authored pattern (an automation flow's "matches" condition) is run
 * against inbound text. These pin which shapes are trusted as a regex and which
 * are matched literally instead — the guard against ReDoS.
 */
describe('isVettedPattern', () => {
  it.each([
    ['^order\\s+\\d+$'],
    ['refund|return'],
    ['(yes|no)'],
    ['[a-z]{2,4}'],
    ['hello.*world'],
  ])('trusts an ordinary pattern: %s', (pattern) => {
    expect(isVettedPattern(pattern)).toBe(true);
  });

  it.each([
    ['(a+)+$'],
    ['(a*)*b'],
    ['(\\w+\\s?)*$'],
    ['(a|aa)+'],
    ['(x+x+){2,}y'],
  ])('refuses a catastrophic-backtracking shape: %s', (pattern) => {
    expect(isVettedPattern(pattern)).toBe(false);
  });

  it('refuses a backreference', () => {
    expect(isVettedPattern('(a)\\1')).toBe(false);
  });

  it('judges shape only — a pattern that does not compile is left to the caller to catch', () => {
    expect(isVettedPattern('(unclosed')).toBe(true);
    expect(() => new RegExp(vetRegexPattern('(unclosed'))).toThrow();
  });

  it('refuses a pattern longer than the cap, and accepts one at it', () => {
    expect(isVettedPattern('a'.repeat(MAX_VETTED_PATTERN))).toBe(true);
    expect(isVettedPattern('a'.repeat(MAX_VETTED_PATTERN + 1))).toBe(false);
  });
});

describe('vetRegexPattern', () => {
  it('hands back a safe pattern unchanged, so it still works as a regex', () => {
    const re = new RegExp(vetRegexPattern('^order\\s+\\d+$'), 'i');
    expect(re.test('Order 42')).toBe(true);
    expect(re.test('order forty-two')).toBe(false);
  });

  it('escapes an unsafe pattern so it only matches its own text', () => {
    const re = new RegExp(vetRegexPattern('(a+)+$'), 'i');
    expect(re.test('aaaa')).toBe(false);
    expect(re.test('please match (a+)+$ literally')).toBe(true);
  });

  it('runs an unsafe pattern in linear time on the input that used to hang it', () => {
    const re = new RegExp(vetRegexPattern('(a+)+$'), 'i');
    const started = performance.now();
    re.test(`${'a'.repeat(40)}!`);
    expect(performance.now() - started).toBeLessThan(100);
  });
});

describe('escapeRegexLiteral', () => {
  it('escapes every metacharacter', () => {
    const text = 'a.b*c+d?e^f$g{h}i(j)k|l[m]n\\o';
    expect(new RegExp(`^${escapeRegexLiteral(text)}$`).test(text)).toBe(true);
  });
});
