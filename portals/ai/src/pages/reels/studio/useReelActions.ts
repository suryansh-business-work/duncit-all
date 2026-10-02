import { useCallback, useMemo } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import type { ReelProjectFormValues } from '../../../forms/reel-project';
import {
  ADD_REEL_DRIVE_ASSETS,
  REEL_PROJECT,
  REMOVE_REEL_ASSET,
  RESTORE_REEL_VERSION,
  UPDATE_REEL_PROJECT,
} from '../queries';

/**
 * Everything the studio changes about a reel outside the chat: its footage, its
 * details, and putting an earlier version back.
 *
 * Each mutation refetches the reel and WAITS for it, so the promise a button is
 * spinning on settles only once the screen shows the result — not a beat before.
 */
export function useReelActions(projectId: string) {
  const { t } = useTranslation();
  const refetch = useMemo(
    () => ({ refetchQueries: [{ query: REEL_PROJECT, variables: { id: projectId } }], awaitRefetchQueries: true }),
    [projectId]
  );
  const [addAssets, { loading: adding }] = useMutation(ADD_REEL_DRIVE_ASSETS, refetch);
  const [removeAssetMutation] = useMutation(REMOVE_REEL_ASSET, refetch);
  const [restoreMutation] = useMutation(RESTORE_REEL_VERSION, refetch);
  const [updateMutation, { loading: saving }] = useMutation(UPDATE_REEL_PROJECT, refetch);

  const addDriveFiles = useCallback(
    async (fileIds: string[]) => {
      try {
        await addAssets({ variables: { project_id: projectId, file_ids: fileIds } });
      } catch (error) {
        notifyError(parseApiError(error, t('ai.reels.sources.addFailed')));
      }
    },
    [addAssets, projectId, t]
  );

  const removeAsset = useCallback(
    async (assetId: string) => {
      try {
        await removeAssetMutation({ variables: { project_id: projectId, asset_id: assetId } });
      } catch (error) {
        notifyError(parseApiError(error, t('ai.reels.sources.removeFailed')));
      }
    },
    [removeAssetMutation, projectId, t]
  );

  const restoreVersion = useCallback(
    async (messageId: string) => {
      try {
        await restoreMutation({ variables: { project_id: projectId, message_id: messageId } });
        notifySuccess(t('ai.reels.chat.restored'));
      } catch (error) {
        notifyError(parseApiError(error, t('ai.reels.chat.restoreFailed')));
      }
    },
    [restoreMutation, projectId, t]
  );

  /** Answers true when the details were saved, so the dialog knows to close. */
  const saveDetails = useCallback(
    async (values: ReelProjectFormValues): Promise<boolean> => {
      try {
        await updateMutation({ variables: { id: projectId, input: values } });
        notifySuccess(t('ai.reels.studio.detailsSaved'));
        return true;
      } catch (error) {
        notifyError(parseApiError(error, t('ai.reels.list.saveFailed')));
        return false;
      }
    },
    [updateMutation, projectId, t]
  );

  return { addDriveFiles, adding, removeAsset, restoreVersion, saveDetails, saving };
}

export type ReelActions = ReturnType<typeof useReelActions>;
