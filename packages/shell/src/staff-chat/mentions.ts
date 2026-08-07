/** An @ followed by a name, the way the server looks for one. */
export const MENTION_TOKEN = /@[\w][\w.-]*/g;

/** The half-typed mention under the caret, or null. */
export const MENTION_QUERY = /@([\w.-]*)$/;

export interface MentionEdit {
  text: string;
  /** Where the caret should land — after the inserted name and its space. */
  caret: number;
}

/**
 * Replace the half-typed @word under the caret with a full name.
 *
 * Works on the text BEFORE the caret only, so mentioning somebody halfway
 * through a message does not disturb what was already written after it.
 */
export function applyMention(text: string, caret: number, name: string): MentionEdit {
  const before = text.slice(0, caret);
  const after = text.slice(caret);
  const match = MENTION_QUERY.exec(before);
  if (!match) return { text, caret };
  const start = before.length - match[0].length;
  // A trailing space, because the next thing after a mention is always words —
  // unless the text already continues with one, which is the mid-sentence case
  // and would otherwise gain a double space nobody typed.
  const inserted = /^\s/.test(after) ? `@${name}` : `@${name} `;
  return { text: before.slice(0, start) + inserted + after, caret: start + inserted.length };
}

/** The name fragment being typed, or null when the caret is not in a mention. */
export function mentionQuery(text: string, caret: number): string | null {
  const match = MENTION_QUERY.exec(text.slice(0, caret));
  return match ? match[1] : null;
}

/**
 * Split a run of text into plain and mention pieces, in order.
 *
 * Returned as data rather than rendered here so the same split can be used by
 * the bubble and by anything else that needs to know where the mentions are.
 */
export function splitMentions(text: string): { text: string; mention: boolean }[] {
  const parts: { text: string; mention: boolean }[] = [];
  let last = 0;
  MENTION_TOKEN.lastIndex = 0;
  let match = MENTION_TOKEN.exec(text);
  while (match) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index), mention: false });
    parts.push({ text: match[0], mention: true });
    last = match.index + match[0].length;
    match = MENTION_TOKEN.exec(text);
  }
  if (last < text.length) parts.push({ text: text.slice(last), mention: false });
  return parts;
}
