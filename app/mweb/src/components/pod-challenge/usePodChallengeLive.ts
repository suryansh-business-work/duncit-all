import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { CHALLENGE_POLL_MS, isChallengeFinished } from '@duncit/utils';
import { POD_CHALLENGE } from './queries';
import { useChallengeSocket } from './useChallengeSocket';
import { useCoalescedRefetch } from './useCoalescedRefetch';

/**
 * One challenge, kept current: a socket signal when signed in, a poll when not
 * (or while the socket is reconnecting). A finished challenge stops polling —
 * its published result changes only by a staff correction, which a signed-in
 * viewer still hears about over the socket.
 */
export function usePodChallengeLive(challengeId: string) {
  const { data, loading, error, refetch, startPolling, stopPolling } = useQuery(POD_CHALLENGE, {
    variables: { id: challengeId },
    fetchPolicy: 'cache-and-network',
    skip: !challengeId,
  });
  const challenge = data?.podChallenge ?? null;
  const revisionRef = useRef(0);
  revisionRef.current = challenge?.revision ?? 0;

  const refresh = useCoalescedRefetch(refetch);
  const ids = useMemo(() => (challengeId ? [challengeId] : []), [challengeId]);
  const live = useChallengeSocket(ids, () => revisionRef.current, refresh);
  const finished = challenge ? isChallengeFinished(challenge.status) : false;

  useEffect(() => {
    if (!challengeId || live || finished) return undefined;
    startPolling(CHALLENGE_POLL_MS);
    return () => stopPolling();
  }, [challengeId, live, finished, startPolling, stopPolling]);

  // When this answer arrived, so a running clock advances from it rather than
  // from the device's own (possibly wrong) wall clock.
  const serverNow = challenge?.server_now;
  const [receivedAt, setReceivedAt] = useState(() => Date.now());
  useEffect(() => {
    if (serverNow) setReceivedAt(Date.now());
  }, [serverNow]);

  return { challenge, loading: loading && !challenge, error: challenge ? undefined : error, receivedAt, live, reload: refresh };
}
