import { useEffect } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { fireAndForget, logs } from '@duncit/logs';
import { useWebConsent } from '../../app/useWebConsent';
import { applyWebConsent } from './applyWebConsent';
import {
  MY_TRACKING_CONSENT,
  SET_MY_TRACKING_CONSENT,
  type MyTrackingConsentData,
  type SetMyTrackingConsentVars,
} from './queries';

/**
 * Keep a signed-in member's tracking choice on the server as well as on this
 * device — the record that proves the consent (GDPR Art. 7(1)).
 *
 * - This device has answered and the server disagrees (or has nothing):
 *   the device's answer is the newer action, so it is recorded.
 * - This device has not answered but the server has: the member answered on
 *   another device, so that answer is adopted instead of asking again.
 */
export function useConsentSync(isAuthed: boolean): void {
  const choice = useWebConsent();
  const { data } = useQuery<MyTrackingConsentData>(MY_TRACKING_CONSENT, {
    skip: !isAuthed,
    fetchPolicy: 'cache-and-network',
  });
  const [record] = useMutation<unknown, SetMyTrackingConsentVars>(SET_MY_TRACKING_CONSENT, {
    refetchQueries: [MY_TRACKING_CONSENT],
  });

  useEffect(() => {
    if (!isAuthed || !data) return;
    const server = data.myTrackingConsent;
    if (!choice) {
      if (server) applyWebConsent(server);
      return;
    }
    if (server?.analytics === choice.analytics && server.marketing === choice.marketing) return;
    fireAndForget(
      record({
        variables: {
          input: { analytics: choice.analytics, marketing: choice.marketing, surface: 'MWEB' },
        },
      }),
      logs.mWeb,
      'consent',
      'useConsentSync'
    );
  }, [isAuthed, data, choice, record]);
}
