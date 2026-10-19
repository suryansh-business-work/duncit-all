import { PodModel } from '@modules/pods/pod/pod.model';
import { ClubModel } from '@modules/clubs/club/club.model';
import { PodMessageModel } from './chat.model';
import { ChatReadStateModel } from './chatState.model';
import { assertRoomMember, blockedPeerIds, type ChatRoomRef } from './chat.access';
import { chatMuteService } from './chat.mute';
import { myClubRoomsFilter, myPodRoomsFilter } from './chat.service';

type RoomKind = ChatRoomRef['kind'];

/**
 * A room the member has never opened counts only this far back. Counting a
 * busy club's whole history the first time someone sees it would put a
 * meaningless "4,000" on the row; a week of lines is what "new" means there.
 */
export const UNREAD_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

const roomField = (kind: RoomKind) => (kind === 'POD' ? 'pod_id' : 'club_id');

/**
 * Unread lines per room for one member, in TWO queries whatever the number of
 * rooms: their read marks, then one aggregation whose `$or` branches each use
 * the room's (id, createdAt) index. Their own lines, removed lines, system
 * lines and lines from anyone blocked either way never count.
 */
export async function unreadCounts(
  userId: string,
  kind: RoomKind,
  roomIds: ReadonlyArray<string>,
  now = Date.now()
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (roomIds.length === 0) return counts;
  const [reads, blocked] = await Promise.all([
    ChatReadStateModel.find({ user_id: userId, room_kind: kind, room_id: { $in: [...roomIds] } })
      .select('room_id last_read_at')
      .lean<{ room_id: string; last_read_at: Date }[]>(),
    blockedPeerIds(userId),
  ]);
  const readAt = new Map(reads.map((r) => [r.room_id, r.last_read_at]));
  const floor = new Date(now - UNREAD_LOOKBACK_MS);
  const field = roomField(kind);
  const rows = await PodMessageModel.aggregate<{ _id: string; n: number }>([
    {
      $match: {
        $or: roomIds.map((id) => ({ [field]: id, createdAt: { $gt: readAt.get(id) ?? floor } })),
        deleted: false,
        type: { $ne: 'SYSTEM' },
        user_id: { $nin: [userId, ...blocked] },
      },
    },
    { $group: { _id: `$${field}`, n: { $sum: 1 } } },
  ]);
  for (const row of rows) counts.set(String(row._id), row.n);
  return counts;
}

export const chatUnreadService = {
  /**
   * Marks a room read up to now. `$max` keeps the mark moving forward only, so
   * two devices (or a late request) can never wind it back and resurrect
   * lines already seen. Members only.
   */
  async markRead(userId: string, room: ChatRoomRef, now = Date.now()) {
    await assertRoomMember(room, userId);
    await ChatReadStateModel.updateOne(
      { user_id: userId, room_kind: room.kind, room_id: room.id },
      { $max: { last_read_at: new Date(now) } },
      { upsert: true }
    );
    return true;
  },

  /** Every unread line across the member's pod and club rooms, muted rooms left out. */
  async unreadTotal(userId: string, now = Date.now()) {
    const [pods, clubs] = await Promise.all([
      PodModel.find(await myPodRoomsFilter(userId)).select('_id').lean(),
      ClubModel.find(await myClubRoomsFilter(userId)).select('_id').lean(),
    ]);
    const podIds = pods.map((p) => String(p._id));
    const clubIds = clubs.map((c) => String(c._id));
    const [podMutes, clubMutes] = await Promise.all([
      chatMuteService.statesFor(userId, 'POD', podIds, now),
      chatMuteService.statesFor(userId, 'CLUB', clubIds, now),
    ]);
    const audible = (ids: string[], mutes: Map<string, { is_muted: boolean }>) =>
      ids.filter((id) => !mutes.get(id)?.is_muted);
    const [podCounts, clubCounts] = await Promise.all([
      unreadCounts(userId, 'POD', audible(podIds, podMutes), now),
      unreadCounts(userId, 'CLUB', audible(clubIds, clubMutes), now),
    ]);
    let total = 0;
    for (const n of podCounts.values()) total += n;
    for (const n of clubCounts.values()) total += n;
    return total;
  },
};
