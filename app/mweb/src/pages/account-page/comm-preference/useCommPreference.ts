import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { logs } from '@duncit/logs';
import {
  MY_COMM_PREFERENCE,
  SET_MY_OTP_CHANNEL,
  type CommChannel,
  type CommPreference,
} from './queries';

/**
 * The Communication Preferences section's data and its one write.
 *
 * The failure is kept as a flag rather than the thrown message: a raw Apollo
 * string is neither localized nor anything the reader can act on (rule 38). It
 * still reaches the log, where somebody can use it.
 */
export function useCommPreference() {
  const [busyChannel, setBusyChannel] = useState<CommChannel | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data, loading, error } = useQuery<{ myCommunicationPreference: CommPreference }>(
    MY_COMM_PREFERENCE,
    { fetchPolicy: 'cache-and-network' },
  );
  const [setChannel] = useMutation<any>(SET_MY_OTP_CHANNEL);

  const preference = data?.myCommunicationPreference ?? null;

  const setOtpChannel = useCallback(
    async (channel: CommChannel, enabled: boolean) => {
      setBusyChannel(channel);
      setSaveFailed(false);
      try {
        // The mutation returns the whole sheet, so the cache lands on the same
        // shape the query wrote and nothing needs refetching — including the
        // other channels' `otp_can_disable`, which this write can move.
        await setChannel({ variables: { channel, enabled } });
        setSaved(true);
      } catch (err) {
        setSaveFailed(true);
        logs.mWeb.error('useCommPreference', 'setOtpChannel', { error: err, channel, enabled });
      } finally {
        setBusyChannel(null);
      }
    },
    [setChannel],
  );

  return {
    preference,
    /** True only on the FIRST load — a refetch must not blank the section. */
    loading: loading && !preference,
    loadFailed: !!error && !preference,
    busyChannel,
    saveFailed,
    saved,
    dismissSaved: () => setSaved(false),
    setOtpChannel,
  };
}
