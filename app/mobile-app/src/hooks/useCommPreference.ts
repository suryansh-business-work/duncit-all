import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { logs } from '@duncit/logs';
import type { CommChannel } from '@duncit/utils';

import {
  MobileCommPreferenceDocument,
  MobileSetOtpChannelDocument,
} from '@/graphql/comm-preference';
import { CommChannel as GqlCommChannel } from '@/generated/graphql/graphql';
import { graphqlRequest } from '@/services/graphql.client';

export type CommPreference = ResultOf<
  typeof MobileCommPreferenceDocument
>['myCommunicationPreference'];

/** The codegen enum the mutation wants, from the plain string both apps share. */
const GQL_CHANNEL: Record<CommChannel, GqlCommChannel> = {
  EMAIL: GqlCommChannel.Email,
  WHATSAPP: GqlCommChannel.Whatsapp,
  SMS: GqlCommChannel.Sms,
};

/**
 * Communication Preferences data + its one write — RN twin of mWeb's
 * `useCommPreference` (rule 27).
 *
 * The mutation returns the whole sheet, so there is no refetch and no local
 * merge. That matters more here than it looks: switching one channel off can
 * change whether ANOTHER channel is still allowed to be switched off, and a
 * per-row optimistic update would show a switch the server would refuse.
 */
export function useCommPreference() {
  const [preference, setPreference] = useState<CommPreference | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busyChannel, setBusyChannel] = useState<CommChannel | null>(null);

  useEffect(() => {
    let active = true;
    graphqlRequest(MobileCommPreferenceDocument, undefined, { auth: true })
      .then((data) => active && setPreference(data.myCommunicationPreference))
      .catch(() => active && setLoadFailed(true))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const setOtpChannel = useCallback(
    async (channel: CommChannel, enabled: boolean) => {
      if (busyChannel !== null) return;
      setBusyChannel(channel);
      setSaveFailed(false);
      try {
        const data = await graphqlRequest(
          MobileSetOtpChannelDocument,
          { channel: GQL_CHANNEL[channel], enabled },
          { auth: true },
        );
        setPreference(data.setMyOtpChannel);
        setSaved(true);
      } catch (error) {
        // Includes the server refusing to switch off the last reachable
        // channel — a flag rather than the thrown string, which is neither
        // localized nor actionable (rule 38).
        setSaveFailed(true);
        logs.mobileApp.error('useCommPreference', 'setOtpChannel', { error, channel, enabled });
      } finally {
        setBusyChannel(null);
      }
    },
    [busyChannel],
  );

  return {
    preference,
    isLoading,
    loadFailed,
    saveFailed,
    saved,
    busyChannel,
    dismissSaved: useCallback(() => setSaved(false), []),
    setOtpChannel,
  };
}
