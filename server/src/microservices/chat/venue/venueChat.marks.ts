/**
 * How far each member has read a venue thread — what draws the "seen" faces
 * under a line, as Google Chat does: the venue's face under the last line it
 * read, and each host's. The venue's mark is drawn as the venue (its name and
 * photo), the same way its lines are signed.
 */
import { displayFrom, userDisplayMap, type UserDisplay } from '@modules/access/user/user.display';
import { threadMembers, type VenueChatThread } from './venueChat.access';
import { emitToThread, VENUE_CHAT_EVENTS } from './venueChat.emit';
import { markVenueChatRead, venueChatReadMarks } from './venueChat.read';

type Side = 'HOST' | 'VENUE';

/** One member's read mark, as `venueChatRoom.read_marks` and the `venue_chat_read` event carry it. */
export interface VenueChatReadMark {
  user_id: string;
  side: Side;
  name: string;
  photo: string | null;
  last_read_at: string;
}

/** A member's side: the venue's owner reads as the venue, everyone else as a host. */
const sideOfMember = (thread: VenueChatThread, userId: string): Side => (thread.ownerId === userId ? 'VENUE' : 'HOST');

function markOf(thread: VenueChatThread, userId: string, side: Side, at: Date, person: UserDisplay): VenueChatReadMark {
  const venue = side === 'VENUE';
  return {
    user_id: userId,
    side,
    name: venue ? thread.venueName || person.name : person.name,
    photo: (venue ? thread.venuePhoto || person.photo : person.photo) || null,
    last_read_at: at.toISOString(),
  };
}

/** Every other member's read mark — a member who never opened the thread has none. Two reads. */
export async function readMarksFor(thread: VenueChatThread, viewerId: string): Promise<VenueChatReadMark[]> {
  const others = threadMembers(thread).filter((id) => id !== String(viewerId));
  const marks = await venueChatReadMarks(thread.podId, others);
  const display = await userDisplayMap(marks.keys());
  return [...marks.entries()].map(([userId, at]) => markOf(thread, userId, sideOfMember(thread, userId), at, displayFrom(display, userId)));
}

/**
 * Marks the member read up to now and tells the thread, so their face moves
 * down on the other side's screen. `person` skips the name lookup when the
 * caller already has it.
 */
export async function readThread(thread: VenueChatThread, userId: string, side: Side, person?: UserDisplay) {
  const now = new Date();
  await markVenueChatRead(userId, thread.podId, now.getTime());
  const who = person ?? displayFrom(await userDisplayMap([userId]), userId);
  emitToThread(thread.podId, VENUE_CHAT_EVENTS.read, { pod_id: thread.podId, ...markOf(thread, userId, side, now, who) });
}
