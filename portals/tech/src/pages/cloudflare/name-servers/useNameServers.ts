import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import type { NameServerTarget } from '@duncit/gql-types';
import { CHECK_CLOUDFLARE_ACTIVATION, CLOUDFLARE_MIGRATION, SET_DOMAIN_NAME_SERVERS } from '../queries';

const REFETCH = { refetchQueries: [CLOUDFLARE_MIGRATION], awaitRefetchQueries: true };

const messageOf = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

/**
 * The nameserver switch and Cloudflare's activation check.
 *
 * The switch always confirms with the exact servers it will write: this is the
 * one control on the page that changes what every *.duncit.com host resolves
 * to, and the server re-checks that nothing would go dark before it writes.
 */
export function useNameServers(domain: string) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [setMutation] = useMutation(SET_DOMAIN_NAME_SERVERS, REFETCH);
  const [checkMutation] = useMutation(CHECK_CLOUDFLARE_ACTIVATION, REFETCH);
  const [busy, setBusy] = useState(false);

  const apply = useCallback(
    async (target: NameServerTarget, servers: readonly string[]): Promise<boolean> => {
      const ok = await confirm({
        title: t('tech.cloudflare.switchTitle'),
        message: t('tech.cloudflare.switchConfirm', { vars: { domain, servers: servers.join('\n') } }),
        destructive: true,
        confirmLabel: t('tech.cloudflare.switchConfirmLabel'),
      });
      if (!ok) return false;
      setBusy(true);
      try {
        await setMutation({ variables: { target, name_servers: target === 'CUSTOM' ? [...servers] : null } });
        notifySuccess(t('tech.cloudflare.switchDone', { vars: { domain } }));
        return true;
      } catch (e) {
        notifyError(messageOf(e, t('tech.cloudflare.switchFailed')));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [confirm, domain, setMutation, t],
  );

  const recheck = useCallback(async () => {
    setBusy(true);
    try {
      await checkMutation();
      notifySuccess(t('tech.cloudflare.recheckDone'));
    } catch (e) {
      notifyError(messageOf(e, t('tech.cloudflare.recheckFailed')));
    } finally {
      setBusy(false);
    }
  }, [checkMutation, t]);

  return { busy, apply, recheck };
}
