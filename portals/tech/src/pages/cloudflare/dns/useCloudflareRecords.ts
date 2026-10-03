import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import type { CloudflareCompareRow } from '@duncit/gql-types';
import {
  CLOUDFLARE_MIGRATION,
  COPY_DNS_TO_CLOUDFLARE,
  CREATE_CLOUDFLARE_ZONE,
  DELETE_CLOUDFLARE_DNS_RECORD,
} from '../queries';

const REFETCH = { refetchQueries: [CLOUDFLARE_MIGRATION], awaitRefetchQueries: true };

/** The rows "Copy all" sends: every GoDaddy-only record the server can write. */
export const copyableRows = (rows: readonly CloudflareCompareRow[]): CloudflareCompareRow[] =>
  rows.filter((row) => row.copyable);

const messageOf = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);

/**
 * The writes on the DNS tab — all of them onto Cloudflare, none onto GoDaddy.
 * Copies and deletes sit behind a confirm that names the hosts, because "copy
 * 14 records" is not something anyone can check before pressing yes.
 */
export function useCloudflareRecords() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [createZone] = useMutation(CREATE_CLOUDFLARE_ZONE, REFETCH);
  const [copyMutation] = useMutation(COPY_DNS_TO_CLOUDFLARE, REFETCH);
  const [deleteMutation] = useMutation(DELETE_CLOUDFLARE_DNS_RECORD, REFETCH);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (work: () => Promise<void>, fallback: string) => {
    setBusy(true);
    try {
      await work();
    } catch (e) {
      notifyError(messageOf(e, fallback));
    } finally {
      setBusy(false);
    }
  }, []);

  const addZone = useCallback(
    () =>
      run(async () => {
        await createZone();
        notifySuccess(t('tech.cloudflare.zoneAdded'));
      }, t('tech.cloudflare.zoneAddFailed')),
    [createZone, run, t],
  );

  const copy = useCallback(
    async (rows: readonly CloudflareCompareRow[]) => {
      if (rows.length === 0) return;
      const ok = await confirm({
        title: t('tech.cloudflare.copyTitle'),
        message: t('tech.cloudflare.copyConfirm', {
          count: rows.length,
          vars: { count: String(rows.length), hosts: rows.map((row) => `${row.type} ${row.host}`).join('\n') },
        }),
        confirmLabel: t('tech.cloudflare.copyConfirmLabel'),
      });
      if (!ok) return;
      await run(async () => {
        const result = (await copyMutation({ variables: { ids: rows.map((row) => row.id) } })).data?.copyDnsToCloudflare;
        if (!result) return;
        if (result.failed === 0) {
          notifySuccess(t('tech.cloudflare.copyDone', { vars: { count: String(result.synced) } }));
          return;
        }
        // Each failure carries Cloudflare's own reason; the first fits a toast,
        // and the rest stay visible as rows still marked GoDaddy-only.
        const first = result.outcomes.find((entry) => !entry.ok);
        notifyError(
          t('tech.cloudflare.copyPartial', {
            vars: { synced: String(result.synced), failed: String(result.failed), reason: first?.message ?? first?.host ?? '' },
          }),
        );
      }, t('tech.cloudflare.copyFailed'));
    },
    [confirm, copyMutation, run, t],
  );

  const remove = useCallback(
    async (row: CloudflareCompareRow) => {
      const ok = await confirm({
        title: t('tech.cloudflare.deleteTitle'),
        message: t('tech.cloudflare.deleteConfirm', {
          vars: { type: row.type, host: row.host, value: row.cloudflare_value ?? '' },
        }),
        destructive: true,
        confirmLabel: t('shell.common.delete'),
      });
      if (!ok) return;
      await run(async () => {
        await deleteMutation({ variables: { id: row.id } });
        notifySuccess(t('shell.common.deleted'));
      }, t('tech.cloudflare.deleteFailed'));
    },
    [confirm, deleteMutation, run, t],
  );

  return { busy, addZone, copy, remove };
}
