import { useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import {
  DISCONNECT_SOCIAL_ACCOUNT,
  SOCIAL_CONNECT_URL,
  SYNC_SOCIAL_ACCOUNT,
  type SocialAccount,
  type SocialProvider,
} from '../queries';

/** Connect, sync now and disconnect — each one reports its own outcome. */
export function useSocialAccountActions(onChanged: () => void) {
  const { t } = useTranslation();
  const [connectMut] = useMutation<{ socialConnectUrl: string }>(SOCIAL_CONNECT_URL);
  const [syncMut] = useMutation<{ syncSocialAccount: SocialAccount }>(SYNC_SOCIAL_ACCOUNT);
  const [disconnectMut, disconnectState] = useMutation<{ disconnectSocialAccount: boolean }>(DISCONNECT_SOCIAL_ACCOUNT);

  /** Off to the provider's consent screen; the server's callback brings the marketer back. */
  const connect = useCallback(
    async (provider: SocialProvider) => {
      try {
        const { data } = await connectMut({ variables: { provider } });
        if (data?.socialConnectUrl) window.location.assign(data.socialConnectUrl);
      } catch (error) {
        notify(parseApiError(error), 'error');
      }
    },
    [connectMut]
  );

  const sync = useCallback(
    async (account: SocialAccount) => {
      try {
        const { data } = await syncMut({ variables: { id: account.id } });
        const result = data?.syncSocialAccount;
        // The sync itself never throws — a network that refused says so on the row.
        if (result && result.status !== 'CONNECTED') {
          notify(result.last_error || t('marketing.social.statusError'), 'error');
        } else {
          notify(t('marketing.social.synced', { vars: { name: account.name } }), 'success');
        }
        onChanged();
      } catch (error) {
        notify(parseApiError(error), 'error');
      }
    },
    [syncMut, onChanged, t]
  );

  const disconnect = useCallback(
    async (account: SocialAccount): Promise<boolean> => {
      try {
        await disconnectMut({ variables: { id: account.id } });
        notify(t('marketing.social.disconnected', { vars: { name: account.name } }), 'success');
        onChanged();
        return true;
      } catch (error) {
        notify(parseApiError(error), 'error');
        return false;
      }
    },
    [disconnectMut, onChanged, t]
  );

  return { connect, sync, disconnect, disconnecting: disconnectState.loading };
}
