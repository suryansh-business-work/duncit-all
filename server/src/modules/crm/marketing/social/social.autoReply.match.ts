import { DM_RULE_ORDER, type AutoReplyKind } from './social.autoReply.model';

/**
 * Whether a rule answers a message. Text is compared word by word, upper-cased,
 * with punctuation and spacing ignored, in any language: "Price?" asks for
 * PRICE, "how much is it" holds HOW MUCH. A KEYWORD rule wants the whole
 * message to be one of its keywords; FAQ and COMMENT_TO_DM want one of their
 * phrases anywhere in it; WELCOME answers a person's first message.
 */
export interface MatchableRule {
  kind: AutoReplyKind;
  keywords: readonly string[];
}

const segmenter = new Intl.Segmenter('en', { granularity: 'word' });

/** The words of a text, upper-cased, without punctuation or spaces. */
export function wordsOf(text: string): string[] {
  return [...segmenter.segment(text.toUpperCase())].filter((part) => part.isWordLike).map((part) => part.segment);
}

function holdsPhrase(words: readonly string[], phrase: readonly string[]): boolean {
  if (phrase.length === 0 || phrase.length > words.length) return false;
  for (let start = 0; start + phrase.length <= words.length; start += 1) {
    if (phrase.every((word, offset) => words[start + offset] === word)) return true;
  }
  return false;
}

export function ruleMatches(rule: MatchableRule, text: string, firstMessage: boolean): boolean {
  if (rule.kind === 'WELCOME') return firstMessage;
  const words = wordsOf(text);
  const phrases = rule.keywords.map(wordsOf).filter((phrase) => phrase.length > 0);
  if (rule.kind === 'KEYWORD') {
    const message = words.join(' ');
    return phrases.some((phrase) => phrase.join(' ') === message);
  }
  return phrases.some((phrase) => holdsPhrase(words, phrase));
}

/**
 * The rule that answers a DM: KEYWORD before FAQ before WELCOME, and within a
 * kind the oldest rule (the list comes oldest first). Null when none does.
 */
export function pickDmRule<T extends MatchableRule>(rules: readonly T[], text: string, firstMessage: boolean): T | null {
  for (const kind of DM_RULE_ORDER) {
    const found = rules.find((rule) => rule.kind === kind && ruleMatches(rule, text, firstMessage));
    if (found) return found;
  }
  return null;
}
