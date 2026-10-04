import { evaluateCondition } from '../../automation.vars';

jest.mock('@modules/access/user/user.model', () => ({ UserModel: {} }));
jest.mock('@modules/crm/marketing/waCampaign.recipients', () => ({ WA_VARIABLES: [] }));

/**
 * A Condition node compares a flow value with what its author typed. The
 * comparisons are case-insensitive and trimmed; "matches" treats the author's
 * text as a regex only when its shape cannot backtrack catastrophically.
 */
describe('evaluateCondition', () => {
  it('contains: case-insensitive substring, never true for an empty expectation', () => {
    expect(evaluateCondition('I want a REFUND please', 'contains', 'refund')).toBe(true);
    expect(evaluateCondition('hello', 'contains', 'bye')).toBe(false);
    expect(evaluateCondition('hello', 'contains', '  ')).toBe(false);
  });

  it('equals: compares trimmed, lower-cased text', () => {
    expect(evaluateCondition('  Yes ', 'equals', 'yes')).toBe(true);
    expect(evaluateCondition('yes', 'equals', 'no')).toBe(false);
  });

  it('starts_with: prefix match, never true for an empty expectation', () => {
    expect(evaluateCondition('Order 42', 'starts_with', 'order')).toBe(true);
    expect(evaluateCondition('My order', 'starts_with', 'order')).toBe(false);
    expect(evaluateCondition('Order', 'starts_with', '')).toBe(false);
  });

  it('matches: an ordinary pattern works as a case-insensitive regex', () => {
    expect(evaluateCondition('ORDER 42', 'matches', '^order\\s+\\d+$')).toBe(true);
    expect(evaluateCondition('order forty-two', 'matches', '^order\\s+\\d+$')).toBe(false);
  });

  it('matches: a catastrophic-backtracking pattern is matched literally, and fast', () => {
    const started = performance.now();
    expect(evaluateCondition(`${'a'.repeat(40)}!`, 'matches', '(a+)+$')).toBe(false);
    expect(performance.now() - started).toBeLessThan(100);
    expect(evaluateCondition('send (a+)+$ please', 'matches', '(a+)+$')).toBe(true);
  });

  it('matches: a pattern that does not compile is matched literally', () => {
    expect(evaluateCondition('price (unclosed', 'matches', '(unclosed')).toBe(true);
  });

  it('matches: only the first 2000 characters of the input are looked at', () => {
    const tail = `${'x'.repeat(2000)}needle`;
    expect(evaluateCondition(tail, 'matches', 'needle')).toBe(false);
    expect(evaluateCondition(`needle${'x'.repeat(3000)}`, 'matches', 'needle')).toBe(true);
  });

  it('is_empty / not_empty look at the trimmed value', () => {
    expect(evaluateCondition('   ', 'is_empty', '')).toBe(true);
    expect(evaluateCondition('x', 'is_empty', '')).toBe(false);
    expect(evaluateCondition('x', 'not_empty', '')).toBe(true);
    expect(evaluateCondition('  ', 'not_empty', '')).toBe(false);
  });

  it('an unknown operator never matches', () => {
    expect(evaluateCondition('anything', 'greater_than', '1')).toBe(false);
  });
});
