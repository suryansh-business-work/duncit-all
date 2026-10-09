import { getIo, type AuthedSocket } from '@realtime/io';
import { logs } from '@observability/log';
import { PodChallengeModel } from './podChallenge.model';
import { accessFor, canView, loadPod } from './podChallenge.access';

/**
 * Live challenge updates over the existing Socket.IO server.
 *
 * The socket carries a SIGNAL, never data: `challenge:changed` names the
 * challenge and its new revision, and the client refetches the challenge
 * through GraphQL, where every visibility rule is applied. The database write
 * always happens before the signal, so a refetch can only see the new state,
 * and a reconnecting client simply refetches once to catch up.
 */

export const CHALLENGE_CHANGED = 'challenge:changed';

export const challengeRoom = (challengeId: string) => `challenge:${challengeId}`;

type Ack = (res: { ok: boolean; error?: string }) => void;

async function join(socket: AuthedSocket, challengeId: unknown, ack?: Ack) {
  const reply = typeof ack === 'function' ? ack : () => undefined;
  try {
    if (typeof challengeId !== 'string' || !/^[a-f\d]{24}$/i.test(challengeId)) {
      return reply({ ok: false, error: 'BAD_REQUEST' });
    }
    const challenge = await PodChallengeModel.findById(challengeId)
      .select('pod_id status enabled show_on_pod_details judge_user_ids')
      .lean();
    if (!challenge) return reply({ ok: false, error: 'NOT_FOUND' });
    const pod = await loadPod(challenge.pod_id.toString());
    const user = socket.userId ? { id: socket.userId, roles: socket.roles ?? [] } : null;
    const access = await accessFor(user, pod);
    if (!canView(challenge, access, socket.userId)) return reply({ ok: false, error: 'NOT_FOUND' });
    await socket.join(challengeRoom(challengeId));
    reply({ ok: true });
  } catch (error) {
    logs.server.warn('challenge', 'join_challenge', { error, msg: 'join failed', challenge_id: challengeId });
    reply({ ok: false, error: 'INTERNAL' });
  }
}

export function attachChallengeHandlers() {
  getIo().on('connection', (socket: AuthedSocket) => {
    socket.on('join_challenge', async (challengeId: unknown, ack?: Ack) => join(socket, challengeId, ack));
    socket.on('leave_challenge', async (challengeId: unknown) => {
      if (typeof challengeId === 'string') await socket.leave(challengeRoom(challengeId));
    });
  });
}

/** Announces a persisted change. A no-op when the socket server is not running (tests, scripts). */
export function emitChallengeChanged(challengeId: string, revision: number, kind: string) {
  try {
    getIo().to(challengeRoom(challengeId)).emit(CHALLENGE_CHANGED, { challengeId, revision, kind });
  } catch {
    // io not initialised — clients still converge on their next refetch.
  }
}

