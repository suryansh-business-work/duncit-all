import { useCallback, useState } from 'react';

import type { PodChallengeEntryInput } from '@/generated/graphql/graphql';
import {
  AnswerPodChallengeQuizDocument,
  BuzzPodChallengeDocument,
  CastPodChallengePollDocument,
  ReachPodChallengeCheckpointDocument,
  RemovePodChallengeEntryDocument,
  SubmitPodChallengeEntryDocument,
} from '@/graphql/challenge-tools';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { graphqlRequest } from '@/services/graphql.client';

/**
 * What a viewer does in a challenge's tools — the RN twin of mWeb's
 * useChallengeToolActions (rule 27). Each resolves to whether it succeeded; a
 * refusal (closed window, not a competitor, already answered) is kept in
 * `error` with the server's own reason and never swallowed.
 */
export function useChallengeToolActions(
  challengeId: string,
  adopt: (next: PodChallengeView) => void,
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const attempt = useCallback(
    async (job: () => Promise<PodChallengeView>) => {
      setBusy(true);
      try {
        adopt(await job());
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
    /** For a failure outside a mutation, such as an upload that did not go through. */
    fail: setError,
    poll: (toolInstanceId: string, optionKey: string) =>
      attempt(
        async () =>
          (
            await graphqlRequest(
              CastPodChallengePollDocument,
              { id, toolInstanceId, optionKey },
              auth,
            )
          ).castPodChallengePoll,
      ),
    answer: (toolInstanceId: string, optionIndex: number) =>
      attempt(
        async () =>
          (
            await graphqlRequest(
              AnswerPodChallengeQuizDocument,
              { id, toolInstanceId, optionIndex },
              auth,
            )
          ).answerPodChallengeQuiz,
      ),
    buzz: (toolInstanceId: string) =>
      attempt(
        async () =>
          (await graphqlRequest(BuzzPodChallengeDocument, { id, toolInstanceId }, auth))
            .buzzPodChallenge,
      ),
    submit: (toolInstanceId: string, input: PodChallengeEntryInput) =>
      attempt(
        async () =>
          (
            await graphqlRequest(
              SubmitPodChallengeEntryDocument,
              { id, toolInstanceId, input },
              auth,
            )
          ).submitPodChallengeEntry,
      ),
    removeEntry: (entryId: string) =>
      attempt(
        async () =>
          (await graphqlRequest(RemovePodChallengeEntryDocument, { entryId }, auth))
            .removePodChallengeEntry,
      ),
    checkpoint: (toolInstanceId: string, code: string) =>
      attempt(
        async () =>
          (
            await graphqlRequest(
              ReachPodChallengeCheckpointDocument,
              { id, toolInstanceId, code },
              auth,
            )
          ).reachPodChallengeCheckpoint,
      ),
  };
}

export type ChallengeToolActions = ReturnType<typeof useChallengeToolActions>;
