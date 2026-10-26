/**
 * What happens to a venue thread's lines after they are sent — reactions,
 * edits, removals and how far each member has read — shared by mWeb, the
 * native app and the Partners app (rules 29 + 56). The server is the gate for
 * every change; these helpers only decide what a screen offers and draws.
 */
import type { VenueChatLine, VenueChatReadMark, VenueChatSide } from './venue-chat';

/** The quick emoji every chat offers, in this order — to react, and to drop into the composer. */
export const CHAT_EMOJIS = ['👍', '❤️', '😂', '🎉', '🔥', '😢', '🙏', '😮'] as const;

/** The thread without a line its author removed (the socket's `{ id }`). */
export const withoutVenueChatLine = <T extends Pick<VenueChatLine, 'id'>>(lines: readonly T[], id: string): T[] =>
  lines.filter((line) => line.id !== id);

/** The read marks with this one in — a member's mark only ever moves forward. */
export function withReadMark(marks: readonly VenueChatReadMark[], mark: VenueChatReadMark): VenueChatReadMark[] {
  const current = marks.find((m) => m.user_id === mark.user_id);
  if (current && Date.parse(current.last_read_at) >= Date.parse(mark.last_read_at)) return [...marks];
  return [...marks.filter((m) => m.user_id !== mark.user_id), mark];
}

/**
 * Who has seen how far, drawn as Google Chat draws it: every other member's
 * face under the LAST line they have read (written at or before their mark).
 * Never the reader's own face, never under a line nobody has reached. Lines are
 * oldest first, as every thread keeps them.
 */
export function seenFacesByLine(
  lines: readonly Pick<VenueChatLine, 'id' | 'createdAt'>[],
  marks: readonly VenueChatReadMark[],
  viewerId: string | null | undefined
): Map<string, VenueChatReadMark[]> {
  const faces = new Map<string, VenueChatReadMark[]>();
  for (const mark of marks) {
    if (mark.user_id === viewerId) continue;
    const readAt = Date.parse(mark.last_read_at);
    const reached = [...lines].reverse().find((line) => Date.parse(line.createdAt) <= readAt);
    if (reached) faces.set(reached.id, [...(faces.get(reached.id) ?? []), mark]);
  }
  return faces;
}

/** Whether anyone on the other side has read the thread as far as this line. */
export const seenByOtherSide = (
  line: Pick<VenueChatLine, 'createdAt'>,
  marks: readonly VenueChatReadMark[],
  side: VenueChatSide
): boolean => marks.some((mark) => mark.side !== side && Date.parse(mark.last_read_at) >= Date.parse(line.createdAt));

/**
 * What the reader may do to a line: react to any line still there, rewrite
 * their own text, take back their own text or photo. An offer line changes only
 * through the offer itself (its card's Edit / Withdraw).
 */
export function venueChatLineActions(
  line: Pick<VenueChatLine, 'user_id' | 'type' | 'deleted'>,
  viewerId: string | null | undefined
): { react: boolean; edit: boolean; remove: boolean } {
  if (line.deleted) return { react: false, edit: false, remove: false };
  const own = !!viewerId && line.user_id === viewerId && line.type !== 'OFFER';
  return { react: true, edit: own && line.type === 'TEXT', remove: own && (line.type === 'TEXT' || line.type === 'IMAGE') };
}

/** One emoji's reactions on a line: how many, and whether the reader is one of them. */
export interface ReactionGroup {
  emoji: string;
  count: number;
  mine: boolean;
}

/** A line's reactions as one chip per emoji, in the order they were first used. */
export function reactionGroups(
  reactions: readonly { user_id: string; emoji: string }[] | null | undefined,
  viewerId: string | null | undefined
): ReactionGroup[] {
  const groups = new Map<string, ReactionGroup>();
  for (const reaction of reactions ?? []) {
    const group = groups.get(reaction.emoji) ?? { emoji: reaction.emoji, count: 0, mine: false };
    group.count += 1;
    group.mine = group.mine || (!!viewerId && reaction.user_id === viewerId);
    groups.set(reaction.emoji, group);
  }
  return [...groups.values()];
}
