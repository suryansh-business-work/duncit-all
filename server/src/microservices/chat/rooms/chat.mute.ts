import { GraphQLError } from 'graphql';
import { ChatMuteModel, type ChatRoomKind } from './chatState.model';
import { assertRoomMember } from './chat.access';

/** The lengths offered at the top of a chat. */
export type ChatMuteDuration = 'EIGHT_HOURS' | 'ONE_WEEK' | 'ALWAYS';

const HOUR = 60 * 60 * 1000;
const DURATION_MS: Record<Exclude<ChatMuteDuration, 'ALWAYS'>, number> = {
  EIGHT_HOURS: 8 * HOUR,
  ONE_WEEK: 7 * 24 * HOUR,
};

/** When a mute chosen now ends; null is "Always". */
export function muteEndsAt(duration: ChatMuteDuration, now = Date.now()): Date | null {
  if (duration === 'ALWAYS') return null;
  const ms = DURATION_MS[duration];
  if (!ms) {
    throw new GraphQLError('Unknown mute duration', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  return new Date(now + ms);
}

/** What a client reads about one room's mute. */
export interface ChatMuteState {
  kind: ChatRoomKind;
  id: string;
  is_muted: boolean;
  muted_until: string | null;
}

const isActive = (until: Date | null | undefined, now: number) => !until || until.getTime() > now;

function stateOf(kind: ChatRoomKind, id: string, until: Date | null | undefined, found: boolean, now: number): ChatMuteState {
  const active = found && isActive(until, now);
  return {
    kind,
    id,
    is_muted: active,
    muted_until: active && until ? until.toISOString() : null,
  };
}

/**
 * Who may mute a room: its members for a pod or club, the customer who owns
 * it for a support chat. The support check is loaded lazily so this module
 * never pulls the support service (and its AI client) into the room path.
 */
async function assertCanMute(kind: ChatRoomKind, id: string, userId: string): Promise<void> {
  if (kind === 'SUPPORT') {
    const { supportChatService } = await import('../support/supportChat.service');
    if (!(await supportChatService.canAccessSession(id, userId, false))) {
      throw new GraphQLError('Not your chat', { extensions: { code: 'FORBIDDEN' } });
    }
    return;
  }
  await assertRoomMember({ kind, id }, userId);
}

export const chatMuteService = {
  async mute(userId: string, kind: ChatRoomKind, id: string, duration: ChatMuteDuration, now = Date.now()) {
    await assertCanMute(kind, id, userId);
    const until = muteEndsAt(duration, now);
    // An upsert on the unique key: muting twice (a double tap, a retry) moves
    // the end of the one row instead of racing to insert two.
    await ChatMuteModel.updateOne(
      { user_id: userId, room_kind: kind, room_id: id },
      { $set: { muted_until: until } },
      { upsert: true }
    );
    return stateOf(kind, id, until, true, now);
  },

  async unmute(userId: string, kind: ChatRoomKind, id: string, now = Date.now()) {
    await assertCanMute(kind, id, userId);
    await ChatMuteModel.deleteOne({ user_id: userId, room_kind: kind, room_id: id });
    return stateOf(kind, id, null, false, now);
  },

  /** One member's mute state for a room, after the access check. */
  async stateFor(userId: string, kind: ChatRoomKind, id: string, now = Date.now()) {
    await assertCanMute(kind, id, userId);
    return (await this.statesFor(userId, kind, [id], now)).get(id) ?? stateOf(kind, id, null, false, now);
  },

  /** One member's mute state across many rooms of a kind, in one query. No access check. */
  async statesFor(userId: string, kind: ChatRoomKind, ids: ReadonlyArray<string>, now = Date.now()) {
    const out = new Map<string, ChatMuteState>();
    if (ids.length === 0) return out;
    const rows = await ChatMuteModel.find({ user_id: userId, room_kind: kind, room_id: { $in: [...ids] } })
      .select('room_id muted_until')
      .lean<{ room_id: string; muted_until: Date | null }[]>();
    for (const row of rows) out.set(row.room_id, stateOf(kind, row.room_id, row.muted_until, true, now));
    return out;
  },

  /** The members of a room whose mute is in force now, in one query. */
  async mutedUserIds(kind: ChatRoomKind, id: string, now = Date.now()): Promise<Set<string>> {
    const rows = await ChatMuteModel.find({
      room_kind: kind,
      room_id: id,
      $or: [{ muted_until: null }, { muted_until: { $gt: new Date(now) } }],
    })
      .select('user_id')
      .lean<{ user_id: string }[]>();
    return new Set(rows.map((r) => r.user_id));
  },
};
