import { useNavigate } from 'react-router';
import { useMutation } from '@apollo/client/react';
import type {
  MutationArchiveOccasionThemeArgs,
  MutationDeleteOccasionThemeArgs,
  MutationDuplicateOccasionThemeArgs,
  MutationResetOccasionThemeArgs,
  OccasionTheme,
} from '@duncit/gql-types';
import { notify, useConfirm } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import {
  ARCHIVE_OCCASION_THEME,
  DELETE_OCCASION_THEME,
  DUPLICATE_OCCASION_THEME,
  OCCASION_REFRESH,
  RESET_OCCASION_THEME,
  type DuplicateOccasionThemeData,
} from '../queries';
import { useSetLiveMode } from '../live/useSetLiveMode';

type Look = Pick<OccasionTheme, 'key' | 'name' | 'is_archived'>;

export interface ThemeActions {
  apply: (look: Look) => Promise<boolean>;
  archive: (look: Look) => Promise<boolean>;
  reset: (look: Look) => Promise<boolean>;
  remove: (look: Look) => Promise<boolean>;
  /** Copies the look and opens the copy in the editor. */
  duplicate: (look: Look, name: string) => Promise<boolean>;
}

const REFRESH = { refetchQueries: OCCASION_REFRESH, awaitRefetchQueries: true };

/** Everything a gallery card can do to a look, each confirmed where it cannot be taken back. */
export function useThemeActions(): ThemeActions {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { setLiveMode } = useSetLiveMode();
  const [archiveMut] = useMutation<unknown, MutationArchiveOccasionThemeArgs>(ARCHIVE_OCCASION_THEME, REFRESH);
  const [resetMut] = useMutation<unknown, MutationResetOccasionThemeArgs>(RESET_OCCASION_THEME, REFRESH);
  const [deleteMut] = useMutation<unknown, MutationDeleteOccasionThemeArgs>(DELETE_OCCASION_THEME, REFRESH);
  const [duplicateMut] = useMutation<DuplicateOccasionThemeData, MutationDuplicateOccasionThemeArgs>(DUPLICATE_OCCASION_THEME, REFRESH);

  const run = async (work: () => Promise<unknown>, doneKey: string, name: string): Promise<boolean> => {
    try {
      await work();
      notify(t(doneKey, { vars: { name } }), 'success');
      return true;
    } catch (err) {
      notify(parseApiError(err), 'error');
      return false;
    }
  };

  return {
    apply: (look) => setLiveMode('MANUAL', look),
    archive: (look) =>
      run(
        () => archiveMut({ variables: { key: look.key, archived: !look.is_archived } }),
        look.is_archived ? 'marketing.occasions.actions.unarchived' : 'marketing.occasions.actions.archived',
        look.name,
      ),
    reset: async (look) => {
      const ok = await confirm({
        title: t('marketing.occasions.actions.resetTitle', { vars: { name: look.name } }),
        message: t('marketing.occasions.actions.resetMessage'),
        confirmLabel: t('marketing.occasions.actions.reset'),
        confirmColor: 'warning',
      });
      return ok && run(() => resetMut({ variables: { key: look.key } }), 'marketing.occasions.actions.resetDone', look.name);
    },
    remove: async (look) => {
      const ok = await confirm({
        title: t('marketing.occasions.actions.deleteTitle', { vars: { name: look.name } }),
        message: t('marketing.occasions.actions.deleteMessage'),
        confirmLabel: t('shell.common.delete'),
        destructive: true,
      });
      return ok && run(() => deleteMut({ variables: { key: look.key } }), 'marketing.occasions.actions.deleted', look.name);
    },
    duplicate: (look, name) =>
      run(
        async () => {
          const { data } = await duplicateMut({ variables: { key: look.key, name } });
          const copy = data?.duplicateOccasionTheme;
          if (copy) navigate(`/occasions/themes/${encodeURIComponent(copy.key)}`);
        },
        'marketing.occasions.actions.duplicated',
        name,
      ),
  };
}
