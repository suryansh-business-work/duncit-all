import { getIo, type AuthedSocket } from '@realtime/io';
import { staffChatService } from './staffChat.service';
import type { CallKind, CallOutcome } from './staffCall.model';
import {
  addSocket,
  PRESENCE_STATUSES,
  removeSocket,
  setStatus,
  statusOf,
  type PresenceStatus,
} from './staffPresence';

/**
 * A room per person, not per conversation.
 *
 * Someone signed into three portals has three sockets and needs the message in
 * all of them; and a new conversation has no room to have joined in advance.
 * Joining your own id solves both — and there is nothing to authorise, because
 * `io.use` already proved who this socket is.
 */
const room = (userId: string) => `staff:${userId}`;
/** Everyone signed into a console, for presence broadcasts. */
const STAFF_ROOM = 'staff:all';

const isStatus = (value: unknown): value is PresenceStatus =>
  typeof value === 'string' && (PRESENCE_STATUSES as readonly string[]).includes(value);

function broadcastPresence(userId: string, status: PresenceStatus) {
  try {
    getIo().to(STAFF_ROOM).emit('staff_presence', { user_id: userId, status });
  } catch {
    // No socket server (seed scripts, tests).
  }
}

/**
 * Signalling only.
 *
 * The offer, the answer and the ICE candidates are opaque here — this server
 * forwards them and never looks inside. The audio and video go browser to
 * browser, which is why a call costs no bandwidth here and why the call RECORD
 * is the only trace of it.
 */
function attachCallRelay(socket: AuthedSocket) {
  const relay = (event: string) => {
    socket.on(event, (payload: { to: string } & Record<string, unknown>) => {
      if (!socket.userId || !payload?.to) return;
      getIo()
        .to(room(payload.to))
        .emit(event, { ...payload, from: socket.userId });
    });
  };
  relay('call_offer');
  relay('call_answer');
  relay('call_ice');
  relay('call_decline');
  relay('call_end');
}

export function attachStaffChatHandlers() {
  getIo().on('connection', (socket: AuthedSocket) => {
    if (!socket.userId) return;
    const userId = socket.userId;
    socket.join(room(userId));
    socket.join(STAFF_ROOM);
    broadcastPresence(userId, addSocket(userId));

    socket.on('staff_typing', (peerId: string) => {
      if (!peerId) return;
      socket.to(room(peerId)).emit('staff_typing', { from_user_id: userId });
    });

    // Chosen by the person, or reported by their own idle timer — the server
    // does not guess, because only the browser knows whether anyone is there.
    socket.on('staff_status', (status: unknown) => {
      if (!isStatus(status)) return;
      broadcastPresence(userId, setStatus(userId, status));
    });

    // Written when the call ends, by whoever was on the line. The caller
    // reports it; the callee reports a decline it made itself.
    socket.on(
      'call_record',
      (payload: {
        peerId?: string;
        kind?: CallKind;
        outcome?: CallOutcome;
        durationSeconds?: number;
        startedAt?: string;
      }) => {
        if (!payload?.peerId || !payload.kind || !payload.outcome) return;
        staffChatService
          .recordCall({
            meId: userId,
            peerId: payload.peerId,
            kind: payload.kind,
            outcome: payload.outcome,
            durationSeconds: Number(payload.durationSeconds ?? 0),
            startedAt: payload.startedAt ? new Date(payload.startedAt) : new Date(),
          })
          .catch(() => undefined);
      }
    );

    attachCallRelay(socket);

    socket.on('disconnect', () => {
      const next = removeSocket(userId);
      // Only announce a change: closing one of three tabs is not leaving.
      if (next === 'OFFLINE' || next !== statusOf(userId)) broadcastPresence(userId, next);
    });
  });
}

/**
 * Deliver to both ends.
 *
 * The sender's other tabs need it as much as the recipient does — writing on a
 * laptop and watching the same conversation on a second screen is the normal
 * case, not an edge one.
 */
export function emitStaffMessage(
  message: { from_user_id: string; to_user_id: string },
  event = 'staff_message'
) {
  try {
    const io = getIo();
    io.to(room(message.to_user_id)).emit(event, message);
    io.to(room(message.from_user_id)).emit(event, message);
  } catch {
    // No socket server yet (seed scripts, tests). The message is already saved;
    // the recipient sees it on their next read.
  }
}
