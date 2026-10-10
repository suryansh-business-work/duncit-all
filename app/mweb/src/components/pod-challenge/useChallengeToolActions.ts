import { useMutation } from '@apollo/client/react';
import type { PodChallengeEntryInput } from '@duncit/gql-types';
import { useTranslation } from '../../i18n/useTranslation';
import { notifyError, notifySuccess } from '../notify';
import {
  ANSWER_POD_CHALLENGE_QUIZ,
  BUZZ_POD_CHALLENGE,
  CAST_POD_CHALLENGE_POLL,
  REACH_POD_CHALLENGE_CHECKPOINT,
  REMOVE_POD_CHALLENGE_ENTRY,
  SUBMIT_POD_CHALLENGE_ENTRY,
} from './toolQueries';

/**
 * What a viewer does in a challenge's tools. Each action resolves to whether
 * it succeeded; a refusal (closed window, not a competitor, already answered)
 * is shown with the server's own reason and never swallowed.
 */
export function useChallengeToolActions(challengeId: string) {
  const { t } = useTranslation();
  const [pollMut, pollState] = useMutation(CAST_POD_CHALLENGE_POLL);
  const [answerMut, answerState] = useMutation(ANSWER_POD_CHALLENGE_QUIZ);
  const [buzzMut, buzzState] = useMutation(BUZZ_POD_CHALLENGE);
  const [submitMut, submitState] = useMutation(SUBMIT_POD_CHALLENGE_ENTRY);
  const [removeMut, removeState] = useMutation(REMOVE_POD_CHALLENGE_ENTRY);
  const [checkpointMut, checkpointState] = useMutation(REACH_POD_CHALLENGE_CHECKPOINT);

  const attempt = async (job: () => Promise<unknown>, done: string) => {
    try {
      await job();
      notifySuccess(done);
      return true;
    } catch (error) {
      notifyError((error as Error).message);
      return false;
    }
  };
  const id = challengeId;

  return {
    busy:
      pollState.loading ||
      answerState.loading ||
      buzzState.loading ||
      submitState.loading ||
      removeState.loading ||
      checkpointState.loading,
    poll: (toolInstanceId: string, optionKey: string) =>
      attempt(() => pollMut({ variables: { id, toolInstanceId, optionKey } }), t('mweb.challenge.ballotSaved')),
    answer: (toolInstanceId: string, optionIndex: number) =>
      attempt(() => answerMut({ variables: { id, toolInstanceId, optionIndex } }), t('mweb.challenge.tools.quizAnswered')),
    buzz: (toolInstanceId: string) => attempt(() => buzzMut({ variables: { id, toolInstanceId } }), t('mweb.challenge.tools.buzzed')),
    submit: (toolInstanceId: string, input: PodChallengeEntryInput) =>
      attempt(() => submitMut({ variables: { id, toolInstanceId, input } }), t('mweb.challenge.tools.submitted')),
    removeEntry: (entryId: string) => attempt(() => removeMut({ variables: { entryId } }), t('mweb.challenge.tools.entryRemoved')),
    checkpoint: (toolInstanceId: string, code: string) =>
      attempt(() => checkpointMut({ variables: { id, toolInstanceId, code } }), t('mweb.challenge.tools.checkpointReached')),
  };
}

export type ChallengeToolActions = ReturnType<typeof useChallengeToolActions>;
