import { useMutation } from '@apollo/client/react';
import type { PodChallengeRosterInput, PodChallengeSettingsInput } from '@duncit/gql-types';
import { makeDeviceId } from '@duncit/user-core';
import { notifyError } from '../../components/notify';
import {
  CONTROL_POD_CHALLENGE_CLOCK,
  POD_CHALLENGE_SCORE_LOG,
  PUBLISH_POD_CHALLENGE_RESULT,
  RECORD_POD_CHALLENGE_SCORE,
  SET_POD_CHALLENGE_ROSTER,
  SET_POD_CHALLENGE_ROUND,
  SET_POD_CHALLENGE_VOTING,
  TRANSITION_POD_CHALLENGE,
  UPDATE_POD_CHALLENGE_SETTINGS,
  VOID_POD_CHALLENGE_SCORE,
} from './queries';
import { CONTROL_POD_CHALLENGE_BUZZER, CONTROL_POD_CHALLENGE_QUIZ, PICK_POD_CHALLENGE_RANDOM, SET_POD_CHALLENGE_ITEM } from './toolQueries';

/**
 * Every host action on one challenge. Each returns whether it succeeded; a
 * failure is shown to the host with the server's own reason (a refused
 * transition, a closed vote) and never swallowed. The returned challenge
 * refreshes the Apollo cache, so every panel updates from the server's answer.
 */
export function useHostChallengeActions(challengeId: string) {
  const logRefetch = [{ query: POD_CHALLENGE_SCORE_LOG, variables: { id: challengeId } }];
  const [settingsMut, settingsState] = useMutation(UPDATE_POD_CHALLENGE_SETTINGS);
  const [rosterMut, rosterState] = useMutation(SET_POD_CHALLENGE_ROSTER);
  const [transitionMut, transitionState] = useMutation(TRANSITION_POD_CHALLENGE);
  const [scoreMut, scoreState] = useMutation(RECORD_POD_CHALLENGE_SCORE, { refetchQueries: logRefetch });
  const [voidMut, voidState] = useMutation(VOID_POD_CHALLENGE_SCORE, { refetchQueries: logRefetch });
  const [clockMut, clockState] = useMutation(CONTROL_POD_CHALLENGE_CLOCK);
  const [votingMut, votingState] = useMutation(SET_POD_CHALLENGE_VOTING);
  const [roundMut, roundState] = useMutation(SET_POD_CHALLENGE_ROUND);
  const [publishMut, publishState] = useMutation(PUBLISH_POD_CHALLENGE_RESULT);
  const [itemMut, itemState] = useMutation(SET_POD_CHALLENGE_ITEM);
  const [quizMut, quizState] = useMutation(CONTROL_POD_CHALLENGE_QUIZ);
  const [buzzerMut, buzzerState] = useMutation(CONTROL_POD_CHALLENGE_BUZZER);
  const [pickMut, pickState] = useMutation(PICK_POD_CHALLENGE_RANDOM);

  const attempt = async (job: () => Promise<unknown>) => {
    try {
      await job();
      return true;
    } catch (error) {
      notifyError((error as Error).message);
      return false;
    }
  };
  const id = challengeId;

  return {
    busy:
      settingsState.loading ||
      rosterState.loading ||
      transitionState.loading ||
      clockState.loading ||
      votingState.loading ||
      roundState.loading ||
      publishState.loading ||
      quizState.loading ||
      buzzerState.loading ||
      pickState.loading,
    scoring: scoreState.loading || voidState.loading || itemState.loading,
    settings: (input: PodChallengeSettingsInput) => attempt(() => settingsMut({ variables: { id, input } })),
    roster: (input: PodChallengeRosterInput) => attempt(() => rosterMut({ variables: { id, input } })),
    transition: (action: string) => attempt(() => transitionMut({ variables: { id, action } })),
    // One id per tap: a retried request is recorded once by the server.
    score: (toolInstanceId: string, competitorId: string, value: number, reason?: string) =>
      attempt(() =>
        scoreMut({
          variables: {
            input: { challenge_id: id, tool_instance_id: toolInstanceId, competitor_id: competitorId, value, client_event_id: makeDeviceId(), reason },
          },
        })
      ),
    voidScore: (eventId: string, reason?: string) => attempt(() => voidMut({ variables: { eventId, reason } })),
    clock: (toolInstanceId: string, action: string) => attempt(() => clockMut({ variables: { id, toolInstanceId, action } })),
    voting: (toolInstanceId: string, open: boolean) => attempt(() => votingMut({ variables: { id, toolInstanceId, open } })),
    round: (round: number) => attempt(() => roundMut({ variables: { id, round } })),
    publish: (reason?: string) => attempt(() => publishMut({ variables: { id, reason } })),
    item: (toolInstanceId: string, competitorId: string, itemKey: string, done: boolean) =>
      attempt(() => itemMut({ variables: { id, toolInstanceId, competitorId, itemKey, done } })),
    // A null question closes the open one.
    quiz: (toolInstanceId: string, questionKey: string | null) => attempt(() => quizMut({ variables: { id, toolInstanceId, questionKey } })),
    buzzer: (toolInstanceId: string, arm: boolean) => attempt(() => buzzerMut({ variables: { id, toolInstanceId, arm } })),
    pick: (toolInstanceId: string, reset: boolean) => attempt(() => pickMut({ variables: { id, toolInstanceId, reset } })),
  };
}

export type HostChallengeActions = ReturnType<typeof useHostChallengeActions>;
