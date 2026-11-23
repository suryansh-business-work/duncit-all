import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslation } from '@duncit/app-settings';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { INTEL_ARCHIVE_MEDIA, INTEL_PURGE_MEDIA, INTEL_REINDEX_MEDIA, INTEL_RESTORE_MEDIA, INTEL_TRASH_MEDIA, INTEL_UPDATE_MEDIA, type IntelMedia } from '../../graphql/media';
import type { FileDetailsOutput } from './file-details';

/** Every change to one file. The server checks ownership for each; failures surface as the server's message. */
export function useFileActions(onChanged: () => void) {
  const { t } = useTranslation();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [update, { loading: saving }] = useMutation(INTEL_UPDATE_MEDIA);
  const [archive, archiveState] = useMutation(INTEL_ARCHIVE_MEDIA);
  const [trash, trashState] = useMutation(INTEL_TRASH_MEDIA);
  const [restore, restoreState] = useMutation(INTEL_RESTORE_MEDIA);
  const [purge, purgeState] = useMutation(INTEL_PURGE_MEDIA);
  const [reindex, reindexState] = useMutation(INTEL_REINDEX_MEDIA);
  const busy = saving || archiveState.loading || trashState.loading || restoreState.loading || purgeState.loading || reindexState.loading;

  const run = async (action: () => Promise<unknown>, done: string): Promise<boolean> => {
    try {
      await action();
      notifySuccess(done);
      onChanged();
      return true;
    } catch (err) {
      notifyError(parseApiError(err, t('intel.media.actionFailed')));
      return false;
    }
  };

  return {
    busy,
    saving,
    saveError,
    save: async (file: IntelMedia, values: FileDetailsOutput) => {
      setSaveError(null);
      try {
        await update({ variables: { id: file.id, patch: values } });
        notifySuccess(t('intel.media.saved'));
        onChanged();
      } catch (err) {
        setSaveError(parseApiError(err, t('intel.media.actionFailed')));
      }
    },
    toggleFavorite: (file: IntelMedia) => run(() => update({ variables: { id: file.id, patch: { favorite: !file.favorite } } }), file.favorite ? t('intel.media.unfavorited') : t('intel.media.favorited')),
    toggleArchive: (file: IntelMedia) => run(() => archive({ variables: { id: file.id, archived: !file.archived } }), file.archived ? t('intel.media.unarchived') : t('intel.media.archivedDone')),
    trash: (file: IntelMedia) => run(() => trash({ variables: { id: file.id } }), t('intel.media.trashed')),
    restore: (file: IntelMedia) => run(() => restore({ variables: { id: file.id } }), t('intel.media.restored')),
    purge: (file: IntelMedia) => run(() => purge({ variables: { id: file.id } }), t('intel.media.purged')),
    reindex: (file: IntelMedia) => run(() => reindex({ variables: { id: file.id } }), t('intel.media.reindexQueued')),
  };
}
