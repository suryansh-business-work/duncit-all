import { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { isChallengeFinished, isChallengeInPlay } from '@duncit/utils';
import ErrorBoundary from '../ErrorBoundary';
import LiveChallengeCard from './LiveChallengeCard';
import ChallengeResultCard from './ChallengeResultCard';
import { POD_CHALLENGES } from './queries';

interface Props {
  podId: string;
  /** Pod History shows finished challenges only; Pod Details also shows live ones. */
  finishedOnly?: boolean;
}

/** How often the list re-reads while a challenge may still start or end (each live card follows its own room). */
const LIST_POLL_MS = 30_000;

/**
 * The pod's challenges as the server lets this viewer see them. Before a
 * challenge starts nothing shows; during play each live one gets a live card;
 * after completion its published result replaces it. A challenge that fails to
 * render never takes the pod page down with it.
 */
function Section({ podId, finishedOnly }: Readonly<Props>) {
  const { data, startPolling, stopPolling } = useQuery(POD_CHALLENGES, {
    variables: { podId },
    fetchPolicy: 'cache-and-network',
    skip: !podId,
  });
  const challenges = data?.podChallenges ?? [];
  const pending = !finishedOnly && challenges.some((c) => c.status === 'SCHEDULED' || isChallengeInPlay(c.status));
  useEffect(() => {
    if (!pending) return undefined;
    startPolling(LIST_POLL_MS);
    return () => stopPolling();
  }, [pending, startPolling, stopPolling]);
  const live = finishedOnly ? [] : challenges.filter((c) => isChallengeInPlay(c.status) && c.show_on_pod_details);
  const finished = challenges.filter((c) => isChallengeFinished(c.status) && c.result);
  if (!live.length && !finished.length) return null;

  return (
    <Stack spacing={1.5} data-testid="pod-challenges">
      {live.map((c) => (
        <LiveChallengeCard key={c.id} challengeId={c.id} />
      ))}
      {finished.map((c) => (
        <ChallengeResultCard key={c.id} challenge={c} />
      ))}
    </Stack>
  );
}

export default function PodChallengesSection(props: Readonly<Props>) {
  return (
    <ErrorBoundary>
      <Section {...props} />
    </ErrorBoundary>
  );
}
