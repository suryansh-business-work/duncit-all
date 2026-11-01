import { useCallback, useMemo } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import type { ReelProjectFormValues } from '../../../forms/reel-project';
import {
  ADD_REEL_DRIVE_ASSETS,
  ADD_REEL_STOCK_ASSETS,
  ADD_REEL_UPLOAD_ASSETS,
  REEL_PROJECT,
  REMOVE_REEL_ASSET,
  RESTORE_REEL_VERSION,
  SET_REEL_COVER,
  UPDATE_REEL_PROJECT,
} from '../queries';
import type { ReelStockInput, ReelUploadInput } from '../types';

/**
 * Everything the studio changes about a reel outside the chat: its footage
 * (from Drive, from stock, from the operator's own files), its details, its
 * cover frame, and putting an earlier version back.
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
  const [addStock, { loading: addingStock }] = useMutation(ADD_REEL_STOCK_ASSETS, refetch);
  const [addUploadsMutation, { loading: addingUploads }] = useMutation(ADD_REEL_UPLOAD_ASSETS, refetch);
  const [removeAssetMutation] = useMutation(REMOVE_REEL_ASSET, refetch);
  const [restoreMutation] = useMutation(RESTORE_REEL_VERSION, refetch);
  const [updateMutation, { loading: saving }] = useMutation(UPDATE_REEL_PROJECT, refetch);
  const [coverMutation, { loading: settingCover }] = useMutation(SET_REEL_COVER, refetch);

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

  /** Answers true once the stock files are in the reel. */
  const addStockItems = useCallback(
    async (items: ReelStockInput[]): Promise<boolean> => {
      try {
        await addStock({ variables: { project_id: projectId, items } });
        return true;
      } catch (error) {
        notifyError(parseApiError(error, t('ai.reels.stock.addFailed')));
        return false;
      }
    },
    [addStock, projectId, t]
  );

  /** Answers true once the uploaded files are in the reel. */
  const addUploads = useCallback(
    async (uploads: ReelUploadInput[]): Promise<boolean> => {
      try {
        await addUploadsMutation({ variables: { project_id: projectId, uploads } });
        return true;
      } catch (error) {
        notifyError(parseApiError(error, t('ai.reels.upload.addFailed')));
        return false;
      }
    },
    [addUploadsMutation, projectId, t]
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

  /** Makes the frame at `atMs` the reel's cover. */
  const setCover = useCallback(
    async (atMs: number) => {
      try {
        await coverMutation({ variables: { project_id: projectId, at_ms: Math.max(0, Math.round(atMs)) } });
        notifySuccess(t('ai.reels.cover.set'));
      } catch (error) {
        notifyError(parseApiError(error, t('ai.reels.cover.failed')));
      }
    },
    [coverMutation, projectId, t]
  );

  return {
    addDriveFiles,
    adding,
    addStockItems,
    addingStock,
    addUploads,
    addingUploads,
    removeAsset,
    restoreVersion,
    saveDetails,
    saving,
    setCover,
    settingCover,
  };
}

export type ReelActions = ReturnType<typeof useReelActions>;
