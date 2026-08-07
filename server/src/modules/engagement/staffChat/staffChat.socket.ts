import { logs } from '@observability/log';
import { getIo, type AuthedSocket } from '@realtime/io';
import { staffChatService } from './staffChat.service';
import type { CallKind, CallOutcome } from './staffCall.model';
import {
  addSocket,
  lastSeenOf,
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
    // last_seen rides along so a reader can say WHEN somebody went, not just
    // that they are gone.
    getIo()
      .to(STAFF_ROOM)
      .emit('staff_presence', { user_id: userId, status, last_seen: lastSeenOf(userId) });
  } catch {
    // No socket server (seed scripts, tests).
  }
}

/**
 * Who each person is currently on a call with.
 *
 * The media is peer to peer, so this server would otherwise have no idea a call
 * was in progress — and that is exactly what it needs to know when somebody's
 * browser vanishes. A refresh, a closed tab or a crash all arrive here as a
 * socket disconnect and nothing else; without this map the other end sits
 * looking at a frozen picture until they give up and hang up themselves.
 */
const callPartner = new Map<string, string>();

const pair = (a: string, b: string) => {
  callPartner.set(a, b);
  callPartner.set(b, a);
};

const unpair = (userId: string) => {
  const other = callPartner.get(userId);
  callPartner.delete(userId);
  if (other) callPartner.delete(other);
  return other ?? null;
};

/** Every event that means "this call is over", from either side. */
const ENDING = new Set(['call_decline', 'call_end']);

/**
 * How long a disconnected browser has to come back before its call is ended.
 *
 * A tab that closed and a connection that hiccupped arrive here identically —
 * as a disconnect and nothing else. Ending the call the instant one appears is
 * right for the closed tab and wrong for the hiccup, and behind a proxy the
 * hiccup is routine: it is why a call that survives on localhost drops in
 * production. So the end is SCHEDULED, and only a browser that still has the
 * call running cancels it (see `call_resume`). A refresh cannot: the page that
 * came back has no RTCPeerConnection, so it stays quiet and the call ends a few
 * seconds later, which is still what the other end needs.
 */
const DISCONNECT_GRACE_MS = 6000;

const pendingEnd = new Map<string, ReturnType<typeof setTimeout>>();

function cancelPendingEnd(userId: string) {
  const timer = pendingEnd.get(userId);
  if (!timer) return;
  clearTimeout(timer);
  pendingEnd.delete(userId);
}

/**
 * Signalling only.
 *
 * The offer, the answer and the ICE candidates are opaque here — this server
 * forwards them and never looks inside. The audio and video go browser to
 * browser, which is why a call costs no bandwidth here and why the call RECORD
 * is the only trace of it.
 */
/**
 * How many browsers that person has open.
 *
 * Load-bearing for reading these logs: this server delivers to a room per
 * PERSON, so one signal reaches every tab they have open, and "two of
 * everything" is a symptom with a cause rather than a mystery.
 */
async function socketsIn(userId: string): Promise<number> {
  try {
    const members = await getIo().in(room(userId)).fetchSockets();
    return members.length;
  } catch {
    return -1;
  }
}

function attachCallRelay(socket: AuthedSocket) {
  const relay = (event: string) => {
    socket.on(event, async (payload: { to: string } & Record<string, unknown>) => {
      if (!socket.userId || !payload?.to) return;
      const me = socket.userId;

      /*
        You cannot call yourself.

        Not a hypothetical: rooms are per PERSON, so an offer addressed to your
        own id comes straight back to the tab that sent it. That tab already
        has a peer connection open, so its "one call at a time" guard declines
        — its own call — and the window closes in the time it takes to make a
        round trip. Every call recorded that way was MISSED, from and to the
        same user, twice over because two tabs each declined.

        Refused here rather than only in the UI, because the UI is not the only
        thing that can send this.
      */
      if (payload.to === me) {
        logs.server.warn('staffChat', 'callRelay', {
          msg: `refused ${event}: ${me} addressed itself`,
          event,
          from: me,
        });
        socket.emit('call_error', { reason: 'SELF_CALL' });
        return;
      }

      /*
        Every signal, both ends, with the tab counts.

        The media is peer to peer, so this relay is the ONLY place a call is
        visible to us at all — and a call that dies on the way out leaves
        nothing else behind to read. `call_ice` is left out: it fires dozens of
        times per call and would bury the four events that decide the outcome.
      */
      if (event !== 'call_ice') {
        const [mine, theirs] = await Promise.all([socketsIn(me), socketsIn(payload.to)]);
        logs.server.info('staffChat', 'callRelay', {
          msg: `${event} ${me} -> ${payload.to}`,
          event,
          from: me,
          to: payload.to,
          from_socket: socket.id,
          from_sockets: mine,
          to_sockets: theirs,
          paired_with: callPartner.get(me) ?? null,
        });
      }

      if (event === 'call_offer' || event === 'call_answer') {
        pair(me, payload.to);
      } else if (ENDING.has(event)) {
        unpair(me);
        cancelPendingEnd(me);
      }

      // The offer carries the caller's NAME. Whoever is being rung may have the
      // chat closed and nothing loaded, so resolving the name in the browser
      // means the ringing window says "Coworker" for the one moment it matters.
      const extra =
        event === 'call_offer' ? { from_name: await staffChatService.displayName(me) } : {};

      // `socket.to` rather than `getIo().to`: a signal must never reach the
      // socket that sent it. Every other tab of the recipient still gets it.
      socket.to(room(payload.to)).emit(event, { ...payload, ...extra, from: me });
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
      },
      // Acked with the row's id so the caller can hang a recording on it later.
      // Without this the client has no handle on the call it just finished.
      ack?: (callId: string | null) => void
      ) => {
        if (!payload?.peerId || !payload.kind || !payload.outcome) {
          ack?.(null);
          return;
        }
        logs.server.info('staffChat', 'callRecord', {
          msg: `record ${payload.outcome} ${userId} -> ${payload.peerId}`,
          outcome: payload.outcome,
          from: userId,
          to: payload.peerId,
          socket: socket.id,
        });
        staffChatService
          .recordCall({
            meId: userId,
            peerId: payload.peerId,
            kind: payload.kind,
            outcome: payload.outcome,
            durationSeconds: Number(payload.durationSeconds ?? 0),
            startedAt: payload.startedAt ? new Date(payload.startedAt) : new Date(),
          })
          .then((callId) => ack?.(callId))
          .catch(() => ack?.(null));
      }
    );

    attachCallRelay(socket);

    /*
      "I reconnected and the call is still running."

      Only a browser that still holds the RTCPeerConnection sends this, which is
      what separates a dropped connection from a closed tab. The pairing is
      re-asserted because the call may have been unpaired while it was away.
    */
    socket.on('call_resume', (payload: { to?: string }) => {
      if (!payload?.to) return;
      cancelPendingEnd(userId);
      pair(userId, payload.to);
    });

    socket.on('disconnect', () => {
      const next = removeSocket(userId);

      /*
        Their last tab went: end whatever call they were on.

        A refresh is a disconnect followed by a connect, and the browser that
        reloaded comes back with no call at all — so leaving the other end
        connected would leave them talking to a page that no longer exists.
        Only on the LAST socket: closing one of three tabs is not leaving, and
        the call is still up in the other two. And only after the grace period,
        so a connection that merely blinked does not hang up on them.
      */
      if (next === 'OFFLINE' && callPartner.has(userId)) {
        cancelPendingEnd(userId);
        pendingEnd.set(
          userId,
          setTimeout(() => {
            pendingEnd.delete(userId);
            const partner = unpair(userId);
            if (partner) {
              getIo().to(room(partner)).emit('call_end', { from: userId, reason: 'DISCONNECTED' });
            }
          }, DISCONNECT_GRACE_MS)
        );
      }
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
