/** Longest name fragment typed after "@" that still counts as a mention search. */
export const MENTION_QUERY_MAX = 40;

// "@" at the start of the text or after whitespace (so an email address never
// opens the list), then the fragment typed so far, ending at the caret.
const QUERY = new RegExp(String.raw`(?:^|\s)@([^\s@]{0,${MENTION_QUERY_MAX}})$`);

/**
 * The mention search the caret sits in: what was typed after "@", or null
 * when the text before the caret is not a mention being typed.
 */
export function mentionQueryBefore(textBeforeCaret: string): string | null {
  // The group always takes part in a match (possibly empty), so null means "no match".
  return QUERY.exec(textBeforeCaret)?.[1] ?? null;
}
