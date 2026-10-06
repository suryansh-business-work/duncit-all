import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useMutation } from '@apollo/client/react';
import BrushIcon from '@mui/icons-material/Brush';
import EditIcon from '@mui/icons-material/Edit';
import PublishIcon from '@mui/icons-material/Publish';
import HistoryIcon from '@mui/icons-material/History';
import MovieIcon from '@mui/icons-material/Movie';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { DELETE_CMS_FRAGMENT, PUBLISH_CMS_FRAGMENT, type CmsFragmentRow } from '../queries/fragments';
import { cmsErrorMessage } from '../lib/errors';
import type { RowAction } from '../components/RowActions';

interface Dialogs {
  rename: (fragment: CmsFragmentRow) => void;
  versions: (fragment: CmsFragmentRow) => void;
  /** The reels a Reel Slider component plays. */
  reels: () => void;
}

/** The menu every fragment row carries. */
export function useFragmentRowActions(siteId: string, refresh: () => void, dialogs: Dialogs) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [publishFragment] = useMutation(PUBLISH_CMS_FRAGMENT);
  const [deleteFragment] = useMutation(DELETE_CMS_FRAGMENT);

  const publish = useCallback(
    async (fragment: CmsFragmentRow) => {
      try {
        await publishFragment({ variables: { id: fragment.id } });
        notifySuccess(t('websiteApp.cms.pages.publishedToast'));
        refresh();
      } catch (error) {
        notifyError(cmsErrorMessage(error, t('websiteApp.cms.pages.publishFailed')));
      }
    },
    [publishFragment, refresh, t],
  );

  const remove = useCallback(
    async (fragment: CmsFragmentRow) => {
      const ok = await confirm({
        title: t('websiteApp.cms.fragments.deleteTitle'),
        message: t('websiteApp.cms.fragments.deleteText', { vars: { name: fragment.name } }),
        confirmLabel: t('shell.common.delete'),
        destructive: true,
      });
      if (!ok) return;
      try {
        await deleteFragment({ variables: { id: fragment.id } });
        refresh();
      } catch (error) {
        notifyError(cmsErrorMessage(error, t('websiteApp.cms.fragments.deleteFailed')));
      }
    },
    [confirm, deleteFragment, refresh, t],
  );

  return useCallback(
    (fragment: CmsFragmentRow): RowAction[] => [
      {
        key: 'design',
        label: t('websiteApp.cms.pages.design'),
        icon: <BrushIcon fontSize="small" />,
        onClick: () => navigate(`/sites/${siteId}/fragments/${fragment.id}/design`),
      },
      {
        key: 'reels',
        label: t('websiteApp.cms.fragments.manageReels'),
        icon: <MovieIcon fontSize="small" />,
        hidden: !fragment.blocks.includes('reel-slider'),
        onClick: dialogs.reels,
      },
      { key: 'rename', label: t('websiteApp.cms.fragments.rename'), icon: <EditIcon fontSize="small" />, onClick: () => dialogs.rename(fragment) },
      {
        key: 'publish',
        label: t('websiteApp.cms.pages.publish'),
        icon: <PublishIcon fontSize="small" />,
        hidden: fragment.is_published && !fragment.has_unpublished_changes,
        onClick: () => {
          publish(fragment).catch(() => notifyError(t('websiteApp.cms.pages.publishFailed')));
        },
      },
      { key: 'versions', label: t('websiteApp.cms.pages.versions'), icon: <HistoryIcon fontSize="small" />, onClick: () => dialogs.versions(fragment) },
      {
        key: 'delete',
        label: t('shell.common.delete'),
        icon: <DeleteOutlineIcon fontSize="small" />,
        destructive: true,
        onClick: () => {
          remove(fragment).catch(() => notifyError(t('websiteApp.cms.fragments.deleteFailed')));
        },
      },
    ],
    [dialogs, navigate, publish, remove, siteId, t],
  );
}
