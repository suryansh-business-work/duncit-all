import { useEffect, useState } from 'react';

import {
  MyMeetingDocument,
  type MyMeeting,
  type MyMeetingResult,
  type SurveyKind,
} from '@/graphql/onboarding-survey';
import { graphqlRequest } from '@/services/graphql.client';

/**
 * Loads the signed-in user's onboarding meeting for a kind — scheduled time and
 * join link, synced from the Onboarding portal. Null until loaded / when none.
 */
export function useMyMeeting(kind: SurveyKind) {
  const [meeting, setMeeting] = useState<MyMeeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
  }, [kind]);

  return { meeting, isLoading };
}
