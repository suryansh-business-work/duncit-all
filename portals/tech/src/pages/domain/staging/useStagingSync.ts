import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import type { DnsHostPair } from '@duncit/gql-types';
import { DNS_ZONE, SYNC_STAGING_DNS } from '../queries';
import { isFixableState } from './pairState';

/** The pairs a sync would actually change — what "Sync all" sends. */
export const fixablePairs = (pairs: readonly DnsHostPair[]): DnsHostPair[] =>
  pairs.filter((pair) => pair.fixable && isFixableState(pair.state));

/**
 * Writing production's values onto staging.
 *
 * Always behind a confirm, and the confirm names the hosts rather than counting
 * them: this rewrites DNS, and "sync 14 hosts" is not something anyone can
 * check before pressing yes.
 */
export function useStagingSync() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [syncMutation] = useMutation(SYNC_STAGING_DNS, {
    refetchQueries: [DNS_ZONE],
    awaitRefetchQueries: true,
  });
  const [syncing, setSyncing] = useState(false);

  const run = useCallback(
    async (pairs: readonly DnsHostPair[]) => {
      if (pairs.length === 0) return;
      const hosts = pairs.map((pair) => pair.staging_host).join('\n');
      const ok = await confirm({
        title: t('tech.dnsStaging.syncTitle'),
        message: t('tech.dnsStaging.syncConfirm', {
          count: pairs.length,
          vars: { count: String(pairs.length), hosts },
        }),
        destructive: true,
        confirmLabel: t('tech.dnsStaging.syncConfirmLabel'),
      });
      if (!ok) return;

      setSyncing(true);
      try {
        const result = await syncMutation({ variables: { ids: pairs.map((pair) => pair.id) } });
        const outcome = result.data?.syncStagingDns;
        if (!outcome) return;
        if (outcome.failed === 0) {
          notifySuccess(t('tech.dnsStaging.syncDone', { vars: { count: String(outcome.synced) } }));
          return;
        }
        // Each failure carries GoDaddy's own reason; the first is the one a
        // toast has room for, and the rest are still in the reloaded table.
        const first = outcome.outcomes.find((entry) => !entry.ok);
        notifyError(
          t('tech.dnsStaging.syncPartial', {
            vars: {
              synced: String(outcome.synced),
              failed: String(outcome.failed),
              reason: first?.message ?? first?.host ?? '',
            },
          }),
        );
      } catch (e) {
        notifyError(e instanceof Error ? e.message : t('tech.dnsStaging.syncFailed'));
      } finally {
        setSyncing(false);
      }
    },
    [confirm, syncMutation, t],
  );

  return { syncing, run };
}
