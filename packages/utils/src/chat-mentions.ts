/**
 * @-mentions in a chat composer and bubble, shared by the portals' staff chat
 * (`@duncit/shell`), mWeb and the native app so all three find, insert and draw
 * a mention the same way. Framework-free: each surface keeps its own popup.
 */

/** An @ followed by a name, the way the server looks for one. */
export const MENTION_TOKEN = /@\w[\w.-]*/g;

/** The half-typed mention under the caret, or null. */
export const MENTION_QUERY = /@([\w.-]*)$/;

/**
 * The half-typed `:shortcode` under the caret.
 *
 * At least one character after the colon, unlike `@`: a bare `:` is punctuation
 * far more often than it is the start of an emoji, and popping a list open in
 * the middle of "Ready to ship:" would be maddening.
 */
export const EMOJI_QUERY = /:([a-z_]+)$/i;

/** What is being typed after a `:`, or null. */
export function emojiQuery(text: string, caret: number): string | null {
  const match = EMOJI_QUERY.exec(text.slice(0, caret));
  return match ? match[1] : null;
}

export interface MentionEdit {
  text: string;
  /** Where the caret should land — after the inserted name and its space. */
  caret: number;
}

/** Replace the half-typed `:code` under the caret with the emoji itself. */
export function applyEmoji(text: string, caret: number, emoji: string): MentionEdit {
  const before = text.slice(0, caret);
  const after = text.slice(caret);
  const match = EMOJI_QUERY.exec(before);
  if (!match) return { text, caret };
  const start = before.length - match[0].length;
  return { text: before.slice(0, start) + emoji + after, caret: start + emoji.length };
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

/** Someone who can be mentioned in a pod's or a club's room. */
export interface MentionMember {
  user_id: string;
  full_name: string;
}

/** Characters a mention token can hold — the same set `MENTION_TOKEN` reads. */
const NOT_HANDLE = /[^\w.-]/g;

/**
 * The word typed after `@` for a member: their first name, as the token reader
 * sees it. A first name with no token characters left (a non-Latin script)
 * falls back to the whole name squeezed together, then to `member`, so a pick
 * from the list always inserts something the bubble can find again.
 */
export function mentionHandle(fullName: string): string {
  const trimmed = fullName.trim();
  const first = (trimmed.split(/\s+/)[0] ?? '').replace(NOT_HANDLE, '');
  if (first) return first;
  return trimmed.replace(NOT_HANDLE, '') || 'member';
}

/**
 * The members to offer for a half-typed `@query`: anyone whose name, or any
 * word of it, starts with the query (case-insensitive), never the writer
 * themselves, at most `limit` of them in the order given.
 */
export function filterMentionCandidates<T extends MentionMember>(
  members: ReadonlyArray<T>,
  query: string,
  selfId: string | null | undefined,
  limit = 6,
): T[] {
  const q = query.trim().toLowerCase();
  const seen = new Set<string>();
  const out: T[] = [];
  for (const member of members) {
    if (out.length >= limit) break;
    if (member.user_id === selfId || seen.has(member.user_id)) continue;
    const name = member.full_name.toLowerCase();
    const matches = !q || name.startsWith(q) || name.split(/\s+/).some((word) => word.startsWith(q));
    if (!matches) continue;
    seen.add(member.user_id);
    out.push(member);
  }
  return out;
}

/**
 * The ids to send with a message: each member picked from the list whose
 * `@handle` is still in the text. A pick the writer then deleted is dropped,
 * so nobody is notified about a mention they cannot see.
 */
export function mentionIdsInText(text: string, picked: ReadonlyArray<MentionMember>): string[] {
  const tokens = new Set(
    splitMentions(text)
      .filter((part) => part.mention)
      .map((part) => part.text.slice(1).toLowerCase()),
  );
  const ids: string[] = [];
  for (const member of picked) {
    if (tokens.has(mentionHandle(member.full_name).toLowerCase()) && !ids.includes(member.user_id)) {
      ids.push(member.user_id);
    }
  }
  return ids;
}

/**
 * Who a tapped `@token` in a bubble names: the mentioned user whose handle it
 * is, or null when it is just an @ in the text that named nobody.
 */
export function mentionTarget(token: string, mentioned: ReadonlyArray<MentionMember>): string | null {
  const handle = token.replace(/^@/, '').toLowerCase();
  const hit = mentioned.find((member) => mentionHandle(member.full_name).toLowerCase() === handle);
  return hit ? hit.user_id : null;
}
