import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { CHALLENGE_POLL_MS, isChallengeFinished, watchChallenge } from '@duncit/utils';

import { config } from '@/constants/config';
import type { MobilePodChallengeFieldsFragment } from '@/generated/graphql/graphql';
import { PodChallengeDocument } from '@/graphql/challenges';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { getAuthToken } from '@/services/auth-token';
import { graphqlRequest } from '@/services/graphql.client';
import { fireAndForget } from '@/utils/fire-and-forget';

export type PodChallengeView = MobilePodChallengeFieldsFragment;

/**
 * One challenge, kept current — the RN twin of mWeb's usePodChallengeLive
 * (rule 27). The socket only says "this challenge moved to revision N"; the
 * hook then re-reads it through GraphQL, where the server applies every
 * visibility rule. Without a session (or while the socket reconnects) it
 * polls instead, and a finished challenge stops polling.
 *
 * `receivedAt` is when the answer arrived, so a running clock advances from it
 * rather than from the phone's own (possibly wrong) wall clock.
 */
export function usePodChallengeLive(challengeId: string) {
  const [challenge, setChallenge] = useState<PodChallengeView | null>(null);
  const [receivedAt, setReceivedAt] = useState(() => Date.now());
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);
  const revision = useRef(0);

  /** Adopts a server answer (a read, or the challenge a mutation returned). */
  const adopt = useCallback((next: PodChallengeView | null | undefined) => {
    if (!next) return;
    revision.current = next.revision;
    setChallenge(next);
    setReceivedAt(Date.now());
    setError('');
  }, []);

  const load = useCallback(async () => {
    const res = await graphqlRequest(PodChallengeDocument, { id: challengeId }, { auth: true });
    if (res.podChallenge) adopt(res.podChallenge);
    else setChallenge(null);
  }, [challengeId, adopt]);

  const { isLoading, refetch } = useReloadableQuery(load, {
    enabled: Boolean(challengeId),
    onError: (e) => setError((e as Error)?.message ?? ''),
  });

  useEffect(() => {
    if (!challengeId) return undefined;
    let socket: Socket | undefined;
    let stop: (() => void) | undefined;
    let cancelled = false;
    fireAndForget(
      getAuthToken().then((token) => {
        if (cancelled || !token) return;
        socket = io(config.apiUrl, {
          path: '/socket.io',
          auth: { token },
          transports: ['websocket', 'polling'],
        });
        socket.on('connect', () => setLive(true));
        socket.on('disconnect', () => setLive(false));
        stop = watchChallenge(
          socket,
          challengeId,
          () => revision.current,
          () => fireAndForget(Promise.resolve(refetch())),
        );
      }),
    );
    return () => {
      cancelled = true;
      stop?.();
      socket?.disconnect();
      setLive(false);
    };
  }, [challengeId, refetch]);

  const finished = challenge ? isChallengeFinished(challenge.status) : false;
  useEffect(() => {
    if (!challengeId || live || finished) return undefined;
    const id = setInterval(() => fireAndForget(Promise.resolve(refetch())), CHALLENGE_POLL_MS);
    return () => clearInterval(id);
  }, [challengeId, live, finished, refetch]);

  return { challenge, isLoading, error, receivedAt, refetch, adopt };
}
