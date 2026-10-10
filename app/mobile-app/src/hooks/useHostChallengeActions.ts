import { useCallback, useState } from 'react';
import { makeDeviceId } from '@duncit/user-core';
import type { ChallengeToggle } from '@duncit/utils';

import {
  ControlPodChallengeClockDocument,
  PublishPodChallengeResultDocument,
  RecordPodChallengeScoreDocument,
  SendPodChallengeNoticeDocument,
  SetPodChallengeRosterDocument,
  SetPodChallengeRoundDocument,
  SetPodChallengeVotingDocument,
  TransitionPodChallengeDocument,
  UpdatePodChallengeSettingsDocument,
  VoidPodChallengeScoreDocument,
} from '@/graphql/challenges';
import {
  ControlPodChallengeBuzzerDocument,
  ControlPodChallengeQuizDocument,
  PickPodChallengeRandomDocument,
  SetPodChallengeItemDocument,
} from '@/graphql/challenge-tools';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { graphqlRequest } from '@/services/graphql.client';

interface RosterInput {
  competitors: { competitor_id: string | null; name: string; user_id: string | null }[];
}

/**
 * Every host action on one challenge — the RN twin of mWeb's
 * useHostChallengeActions (rule 27). Each returns whether it succeeded; a
 * failure is shown with the server's own reason and never swallowed. The
 * challenge a mutation returns is handed to `adopt`, so the screen updates
 * from the server's answer rather than from a guess.
 */
export function useHostChallengeActions(
  challengeId: string,
  adopt: (next: PodChallengeView) => void,
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const attempt = useCallback(
    async (job: () => Promise<PodChallengeView | null>) => {
      setBusy(true);
      try {
        const next = await job();
        if (next) adopt(next);
        setError('');
        return true;
      } catch (e) {
        setError((e as Error).message);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [adopt],
  );
  const id = challengeId;
  const auth = { auth: true };

  return {
    busy,
    error,
    clearError: () => setError(''),
    toggle: (key: ChallengeToggle, value: boolean) =>
      attempt(
        async () =>
          (
            await graphqlRequest(
              UpdatePodChallengeSettingsDocument,
              { id, input: { [key]: value } },
              auth,
            )
          ).updatePodChallengeSettings,
      ),
    roster: (input: RosterInput) =>
      attempt(
        async () =>
          (await graphqlRequest(SetPodChallengeRosterDocument, { id, input }, auth))
            .setPodChallengeRoster,
      ),
    transition: (action: string) =>
      attempt(
        async () =>
          (await graphqlRequest(TransitionPodChallengeDocument, { id, action }, auth))
            .transitionPodChallenge,
      ),
    // One id per tap: a retried request is recorded once by the server.
    score: (toolInstanceId: string, competitorId: string, value: number) =>
      attempt(
        async () =>
          (
            await graphqlRequest(
              RecordPodChallengeScoreDocument,
              {
                input: {
                  challenge_id: id,
                  tool_instance_id: toolInstanceId,
                  competitor_id: competitorId,
                  value,
                  client_event_id: makeDeviceId(),
                },
              },
              auth,
            )
          ).recordPodChallengeScore,
      ),
    voidScore: (eventId: string, reason?: string) =>
      attempt(
        async () =>
          (await graphqlRequest(VoidPodChallengeScoreDocument, { eventId, reason }, auth))
            .voidPodChallengeScore,
      ),
    clock: (toolInstanceId: string, action: string) =>
      attempt(
        async () =>
          (
            await graphqlRequest(
              ControlPodChallengeClockDocument,
              { id, toolInstanceId, action },
              auth,
            )
          ).controlPodChallengeClock,
      ),
    voting: (toolInstanceId: string, open: boolean) =>
      attempt(
        async () =>
          (await graphqlRequest(SetPodChallengeVotingDocument, { id, toolInstanceId, open }, auth))
            .setPodChallengeVoting,
      ),
    round: (round: number) =>
      attempt(
        async () =>
          (await graphqlRequest(SetPodChallengeRoundDocument, { id, round }, auth))
            .setPodChallengeRound,
      ),
    publish: (reason?: string) =>
      attempt(
        async () =>
          (await graphqlRequest(PublishPodChallengeResultDocument, { id, reason }, auth))
            .publishPodChallengeResult,
      ),
    item: (toolInstanceId: string, competitorId: string, itemKey: string, done: boolean) =>
      attempt(
        async () =>
          (
            await graphqlRequest(
              SetPodChallengeItemDocument,
              { id, toolInstanceId, competitorId, itemKey, done },
              auth,
            )
          ).setPodChallengeItem,
      ),
    // A null question closes the open one.
    quiz: (toolInstanceId: string, questionKey: string | null) =>
      attempt(
        async () =>
          (
            await graphqlRequest(
              ControlPodChallengeQuizDocument,
              { id, toolInstanceId, questionKey },
              auth,
            )
          ).controlPodChallengeQuiz,
      ),
    buzzer: (toolInstanceId: string, arm: boolean) =>
      attempt(
        async () =>
          (
            await graphqlRequest(
              ControlPodChallengeBuzzerDocument,
              { id, toolInstanceId, arm },
              auth,
            )
          ).controlPodChallengeBuzzer,
      ),
    pick: (toolInstanceId: string, reset: boolean) =>
      attempt(
        async () =>
          (
            await graphqlRequest(
              PickPodChallengeRandomDocument,
              { id, toolInstanceId, reset },
              auth,
            )
          ).pickPodChallengeRandom,
      ),
    notify: (kind: string, retryFailed: boolean) =>
      attempt(async () => {
        await graphqlRequest(SendPodChallengeNoticeDocument, { id, kind, retryFailed }, auth);
        return null;
      }),
  };
}

export type HostChallengeActions = ReturnType<typeof useHostChallengeActions>;
