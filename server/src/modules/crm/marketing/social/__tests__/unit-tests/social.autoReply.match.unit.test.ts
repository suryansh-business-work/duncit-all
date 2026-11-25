import { pickDmRule, ruleMatches, wordsOf } from '../../social.autoReply.match';

const rule = (kind: 'KEYWORD' | 'FAQ' | 'WELCOME' | 'COMMENT_TO_DM', keywords: string[] = [], name: string = kind) => ({ kind, keywords, name });

describe('wordsOf', () => {
  it('reads the words upper-cased, without punctuation or spacing', () => {
    expect(wordsOf('  Price?!  how   much... ')).toEqual(['PRICE', 'HOW', 'MUCH']);
    expect(wordsOf('¿Cuánto cuesta?')).toEqual(['CUÁNTO', 'CUESTA']);
    expect(wordsOf('🙂 !!')).toEqual([]);
  });
});

describe('ruleMatches', () => {
  it('KEYWORD wants the whole message to be one of its keywords', () => {
    const r = rule('KEYWORD', ['PRICE', 'MENU CARD']);
    expect(ruleMatches(r, 'price?', false)).toBe(true);
    expect(ruleMatches(r, 'Menu   card!', false)).toBe(true);
    expect(ruleMatches(r, 'what is the price', false)).toBe(false);
    expect(ruleMatches(r, '', false)).toBe(false);
  });

  it('FAQ and COMMENT_TO_DM find a phrase anywhere, as whole words', () => {
    const faq = rule('FAQ', ['HOW MUCH', 'timing']);
    expect(ruleMatches(faq, 'Hi, how much is the pass?', false)).toBe(true);
    expect(ruleMatches(faq, 'what are the TIMINGS', false)).toBe(false);
    expect(ruleMatches(faq, 'What timing works?', false)).toBe(true);
    expect(ruleMatches(faq, 'much how', false)).toBe(false);
    const comment = rule('COMMENT_TO_DM', ['link']);
    expect(ruleMatches(comment, 'Link please 🙏', false)).toBe(true);
    expect(ruleMatches(comment, 'linked in bio?', false)).toBe(false);
  });

  it('ignores blank keywords and a phrase longer than the message', () => {
    expect(ruleMatches(rule('FAQ', ['', '  ']), 'anything', false)).toBe(false);
    expect(ruleMatches(rule('FAQ', ['A VERY LONG PHRASE']), 'long', false)).toBe(false);
  });

  it('WELCOME answers only a first message, whatever it says', () => {
    expect(ruleMatches(rule('WELCOME'), 'hey', true)).toBe(true);
    expect(ruleMatches(rule('WELCOME'), 'hey', false)).toBe(false);
  });
});

describe('pickDmRule', () => {
  const welcome = rule('WELCOME', [], 'welcome');
  const faq = rule('FAQ', ['PRICE'], 'faq');
  const keyword = rule('KEYWORD', ['PRICE'], 'keyword');
  const older = rule('FAQ', ['PASS'], 'older faq');

  it('tries KEYWORD before FAQ before WELCOME, whatever the list order', () => {
    expect(pickDmRule([welcome, faq, keyword], 'price', true)?.name).toBe('keyword');
    expect(pickDmRule([welcome, faq, keyword], 'the price?', true)?.name).toBe('faq');
    expect(pickDmRule([welcome, faq, keyword], 'hello', true)?.name).toBe('welcome');
  });

  it('takes the first (oldest) rule within a kind, and none when nothing matches', () => {
    expect(pickDmRule([older, rule('FAQ', ['PASS'], 'newer faq')], 'a pass please', false)?.name).toBe('older faq');
    expect(pickDmRule([faq, welcome], 'hello', false)).toBeNull();
    expect(pickDmRule([], 'price', true)).toBeNull();
  });

  it('never picks a comment rule for a DM', () => {
    expect(pickDmRule([rule('COMMENT_TO_DM', ['PRICE'])], 'price', false)).toBeNull();
  });
});
