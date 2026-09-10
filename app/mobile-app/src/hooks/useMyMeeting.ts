import { useCallback, useEffect, useState } from 'react';

import {
  MyMeetingDocument,
  type MyMeeting,
  type MyMeetingResult,
  type SurveyKind,
} from '@/graphql/onboarding-survey';
import { graphqlRequest } from '@/services/graphql.client';
import { useRefreshRegistration } from '@/components/PullToRefresh';

/**
 * Loads the signed-in user's onboarding meeting for a kind — scheduled time and
 * join link, synced from the Onboarding portal. Null until loaded / when none.
 */
export function useMyMeeting(kind: SurveyKind) {
  const [meeting, setMeeting] = useState<MyMeeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [attempt, setAttempt] = useState(0);
  const refetch = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    graphqlRequest<MyMeetingResult, { kind: SurveyKind }>(
      MyMeetingDocument,
      { kind },
      { auth: true },
    )
      .then((data) => active && setMeeting(data.myMeeting))
      .catch(() => active && setMeeting(null))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [kind, attempt]);

  useRefreshRegistration(refetch);

  return { meeting, isLoading };
}
