import { useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { usePortalT } from '../../../shared/i18n';
import {
  LITE_CREATE_ENV_ENTRY,
  LITE_DELETE_ENV_ENTRY,
  LITE_SET_DEFAULT_ENV_ENTRY,
  LITE_TEST_ENV_ENTRY,
  LITE_UPDATE_ENV_ENTRY,
  type LiteEnvCategory,
  type LiteEnvEntry,
  type LiteEnvEntryInput,
  type LiteEnvTestResult,
} from '../../graphql/environment';
import { useAction } from '../../hooks/useAction';

type EntryInput = Omit<LiteEnvEntryInput, 'category'>;

/** Every write the Environment page makes for one category, each reloading the list when done. */
export function useEnvActions(category: LiteEnvCategory, reload: () => void) {
  const { t } = usePortalT();
  const confirm = useConfirm();
  const run = useAction(reload);
  const [createMut, createState] = useMutation(LITE_CREATE_ENV_ENTRY);
  const [updateMut, updateState] = useMutation(LITE_UPDATE_ENV_ENTRY);
  const [deleteMut] = useMutation(LITE_DELETE_ENV_ENTRY);
  const [setDefaultMut] = useMutation(LITE_SET_DEFAULT_ENV_ENTRY);
  const [testMut, testState] = useMutation<{ liteTestEnvEntry: LiteEnvTestResult }>(LITE_TEST_ENV_ENTRY);

  const save = useCallback(
    (editing: LiteEnvEntry | null, input: EntryInput): Promise<boolean> => {
      const vars = { vars: { name: input.name } };
      if (editing) {
        return run(() => updateMut({ variables: { id: editing.id, input: { ...input, category } } }), t('litePortal.environment.updated', vars));
      }
      return run(() => createMut({ variables: { input: { ...input, category } } }), t('litePortal.environment.created', vars));
    },
    [category, createMut, run, t, updateMut],
  );

  const remove = useCallback(
    async (entry: LiteEnvEntry) => {
      const vars = { vars: { name: entry.name } };
      const ok = await confirm({
        title: t('litePortal.common.deleteTitle', vars),
        message: t('litePortal.environment.deleteMessage'),
        confirmLabel: t('lite.common.delete'),
        cancelLabel: t('lite.common.cancel'),
        destructive: true,
      });
      if (!ok) return;
      await run(() => deleteMut({ variables: { id: entry.id } }), t('litePortal.environment.deleted', vars));
    },
    [confirm, deleteMut, run, t],
  );

  const setDefault = useCallback(
    (entry: LiteEnvEntry) => run(() => setDefaultMut({ variables: { id: entry.id } }), t('litePortal.environment.nowDefault', { vars: { name: entry.name } })),
    [run, setDefaultMut, t],
  );

  /** Proves the entry; the outcome is the server's own message either way. */
  const test = useCallback(
    async (entry: LiteEnvEntry, to?: string): Promise<boolean> => {
      try {
        const { data } = await testMut({ variables: { id: entry.id, to: to ?? null } });
        const result = data?.liteTestEnvEntry;
        const message = result?.message ?? '';
        if (result?.ok) notifySuccess(t('litePortal.common.testPassed', { vars: { message } }));
        else notifyError(t('litePortal.common.testFailed', { vars: { message } }));
        reload();
        return Boolean(result?.ok);
      } catch (error) {
        notifyError(parseApiError(error));
        return false;
      }
    },
    [reload, t, testMut],
  );

  return { save, remove, setDefault, test, saving: createState.loading || updateState.loading, testing: testState.loading };
}
