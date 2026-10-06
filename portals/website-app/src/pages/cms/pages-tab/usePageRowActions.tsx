import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import BrushIcon from '@mui/icons-material/Brush';
import SettingsIcon from '@mui/icons-material/Settings';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PublishIcon from '@mui/icons-material/Publish';
import UnpublishedIcon from '@mui/icons-material/Unpublished';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import HistoryIcon from '@mui/icons-material/History';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import LinkIcon from '@mui/icons-material/Link';
import { notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import type { CmsPageRow } from '../queries/pages';
import type { RowAction } from '../components/RowActions';
import { usePageMutations } from './usePageMutations';

export interface PageDialogs {
  settings: (page: CmsPageRow) => void;
  preview: (page: CmsPageRow) => void;
  duplicate: (page: CmsPageRow) => void;
  versions: (page: CmsPageRow) => void;
  /** Copies the draft's live-demo link. */
  copyLink: (page: CmsPageRow) => void;
}

/** The menu every page row carries. */
export function usePageRowActions(siteId: string, refresh: () => void, dialogs: PageDialogs) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { publish, unpublish, remove } = usePageMutations(refresh);
  const fail = useCallback(() => notifyError(t('websiteApp.cms.pages.publishFailed')), [t]);

  return useCallback(
    (page: CmsPageRow): RowAction[] => [
      {
        key: 'design',
        label: t('websiteApp.cms.pages.design'),
        icon: <BrushIcon fontSize="small" />,
        onClick: () => navigate(`/sites/${siteId}/pages/${page.id}/design`),
      },
      { key: 'settings', label: t('websiteApp.cms.pages.settings'), icon: <SettingsIcon fontSize="small" />, onClick: () => dialogs.settings(page) },
      { key: 'preview', label: t('websiteApp.cms.pages.preview'), icon: <VisibilityIcon fontSize="small" />, onClick: () => dialogs.preview(page) },
      { key: 'link', label: t('websiteApp.cms.preview.copyLink'), icon: <LinkIcon fontSize="small" />, onClick: () => dialogs.copyLink(page) },
      {
        key: 'publish',
        label: t('websiteApp.cms.pages.publish'),
        icon: <PublishIcon fontSize="small" />,
        hidden: page.is_published && !page.has_unpublished_changes,
        onClick: () => {
          publish(page).catch(fail);
        },
      },
      {
        key: 'unpublish',
        label: t('websiteApp.cms.pages.unpublish'),
        icon: <UnpublishedIcon fontSize="small" />,
        hidden: !page.is_published,
        onClick: () => {
          unpublish(page).catch(fail);
        },
      },
      {
        key: 'duplicate',
        label: t('websiteApp.cms.pages.duplicate'),
        icon: <ContentCopyIcon fontSize="small" />,
        hidden: page.kind !== 'PAGE',
        onClick: () => dialogs.duplicate(page),
      },
      { key: 'versions', label: t('websiteApp.cms.pages.versions'), icon: <HistoryIcon fontSize="small" />, onClick: () => dialogs.versions(page) },
      {
        key: 'delete',
        label: t('shell.common.delete'),
        icon: <DeleteOutlineIcon fontSize="small" />,
        destructive: true,
        onClick: () => {
          remove(page).catch(() => notifyError(t('websiteApp.cms.pages.deleteFailed')));
        },
      },
    ],
    [dialogs, fail, navigate, publish, remove, siteId, t, unpublish],
  );
}
