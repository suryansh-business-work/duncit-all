import { useEffect, useState } from 'react';
import type { ConsentChoice } from '@duncit/utils';
import { logs } from '@duncit/logs';

import { TrackingConsentSurface } from '@/generated/graphql/graphql';
import { MyTrackingConsentDocument, SetMyTrackingConsentDocument } from '@/graphql/privacy';
import { graphqlRequest } from '@/services/graphql.client';
import { useConsentStore } from '@/stores/consent.store';

/** The server's record once read — `value` null means it has none yet. */
interface ServerRecord {
  value: ConsentChoice | null;
}

const logFailure = (fn: string) => (error: unknown) => {
  logs.mobileApp.error('useConsentSync', fn, { error });
};

/**
 * Keep a signed-in member's tracking choice on the server as well as on this
 * device — the record that proves the consent (GDPR Art. 7(1)). Twin of
 * mWeb's useConsentSync (rule 27).
 *
 * - This device has answered and the server disagrees (or has nothing):
 *   the device's answer is the newer action, so it is recorded.
 * - This device has not answered but the server has: the member answered on
 *   another device, so that answer is adopted instead of asking again.
 */
export function useConsentSync(isAuthed: boolean): void {
  const hydrated = useConsentStore((s) => s.hydrated);
  const choice = useConsentStore((s) => s.choice);
  const setChoice = useConsentStore((s) => s.setChoice);
  const [server, setServer] = useState<ServerRecord | null>(null);

  useEffect(() => {
    setServer(null);
    if (!isAuthed) return;
    graphqlRequest(MyTrackingConsentDocument, undefined, { auth: true })
      .then((data) => setServer({ value: data.myTrackingConsent ?? null }))
      .catch(logFailure('read'));
  }, [isAuthed]);

  useEffect(() => {
    if (!isAuthed || !hydrated || !server) return;
    const remote = server.value;
    if (!choice) {
      if (remote) setChoice(remote);
      return;
    }
    if (remote?.analytics === choice.analytics && remote.marketing === choice.marketing) return;
    const input = {
      analytics: choice.analytics,
      marketing: choice.marketing,
      surface: TrackingConsentSurface.Native,
    };
    graphqlRequest(SetMyTrackingConsentDocument, { input }, { auth: true })
      .then((data) => setServer({ value: data.setMyTrackingConsent }))
      .catch(logFailure('record'));
  }, [isAuthed, hydrated, server, choice, setChoice]);
}
