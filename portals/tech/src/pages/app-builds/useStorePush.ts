import { useCallback } from 'react';
import type { DocumentNode } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import { useTranslation } from '@duncit/shell';
import { useConfirm, notifySuccess, notifyError } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import type { AppBuildRow } from './queries';

/** The copy one store's push needs — every value a literal `tech.appBuilds.*` key. */
export interface StorePushCopy<T extends string> {
  trackKey: Record<T, string>;
  confirmKey: Record<T, string>;
  titleKey: string;
  actionKey: string;
  startedKey: string;
  /** The track whose confirm is styled as destructive — the one that reaches every user. */
  destructive: T;
}

export type PushToStore<T extends string> = (row: AppBuildRow, track: T) => Promise<void>;

/**
 * Confirm, then push one build to one track of one store.
 *
 * A production or review push cannot be taken back from here, so the confirm
 * names the build, the version and the track before anything is sent. The
 * mutation answers as soon as the push is recorded — the row shows it in
 * flight and the table polls until the server has heard back from the store.
 */
export function useStorePush<T extends string>(
  mutation: DocumentNode,
  copy: StorePushCopy<T>,
  onPushed: () => void
): PushToStore<T> {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [push] = useMutation<any>(mutation);

  return useCallback(
    async (row: AppBuildRow, track: T) => {
      const trackLabel = t(copy.trackKey[track]);
      const build = row.build_name || row.build_no;
      const ok = await confirm({
        title: t(copy.titleKey, { vars: { build, track: trackLabel } }),
        message: t(copy.confirmKey[track], { vars: { version: row.version } }),
        confirmLabel: t(copy.actionKey),
        destructive: track === copy.destructive,
      });
      if (!ok) return;
      try {
        await push({ variables: { id: row.id, track } });
        notifySuccess(t(copy.startedKey, { vars: { build, track: trackLabel } }));
        onPushed();
      } catch (err) {
        notifyError(parseApiError(err));
      }
    },
    [confirm, push, t, onPushed, copy]
  );
}
