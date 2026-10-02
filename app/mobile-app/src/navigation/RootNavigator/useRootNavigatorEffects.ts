import { useEffect, useRef } from 'react';

import { reportJourneyStep } from '@/services/short-link-attribution';
import { consumePendingBooking } from '../pendingBooking';
import { navigationRef } from '../navigationRef';

/** Short-link journey reports and the parked-booking replay, keyed on the
 * auth store's token and survey flag. */
export function useRootNavigatorEffects(token: string | null, surveyCompleted: boolean) {
  // Short-link journey: a session binds the click to the account, and the
  // survey flag flipping true IS the survey being finished. Both are no-ops
  // for the vast majority who never followed a link, and the server keeps a
  // step's first timestamp, so repeats never move anything.
  const prevSurveyCompleted = useRef(surveyCompleted);
  useEffect(() => {
    if (token) reportJourneyStep('SIGNED_UP');
  }, [token]);
  useEffect(() => {
    if (token && surveyCompleted && !prevSurveyCompleted.current) {
      reportJourneyStep('SURVEY_DONE');
    }
    prevSurveyCompleted.current = surveyCompleted;
  }, [token, surveyCompleted]);

  // Replay a booking deep link that arrived while signed out (linking.ts parked
  // it and routed to Login) — the native twin of mWeb's `?redirect` return.
  //
  // Readiness is checked BEFORE consuming. consume() clears the parked id, so
  // doing it first threw the link away whenever the navigator was not ready on
  // the render where token/surveyCompleted flipped — and these deps never fire
  // again, so the deep link was lost for good. Cold start then log in was
  // exactly that path.
  useEffect(() => {
    if (!token || !surveyCompleted || !navigationRef.isReady()) return;
    const bookingId = consumePendingBooking();
    if (bookingId) {
      navigationRef.navigate('Booking', { bookingId });
    }
  }, [token, surveyCompleted]);
}
