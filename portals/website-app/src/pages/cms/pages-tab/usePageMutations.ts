import { useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { DELETE_CMS_PAGE, PUBLISH_CMS_PAGE, UNPUBLISH_CMS_PAGE, type CmsPageRow } from '../queries/pages';
import { cmsErrorMessage } from '../lib/errors';

/** Publish, unpublish and delete for the pages table; each refreshes it. */
export function usePageMutations(refresh: () => void) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [publishPage] = useMutation(PUBLISH_CMS_PAGE);
  const [unpublishPage] = useMutation(UNPUBLISH_CMS_PAGE);
  const [deletePage] = useMutation(DELETE_CMS_PAGE);

  const publish = useCallback(
    async (page: CmsPageRow) => {
      try {
        await publishPage({ variables: { id: page.id } });
        notifySuccess(t('websiteApp.cms.pages.publishedToast'));
        refresh();
      } catch (error) {
        notifyError(cmsErrorMessage(error, t('websiteApp.cms.pages.publishFailed')));
      }
    },
    [publishPage, refresh, t],
  );

  const unpublish = useCallback(
    async (page: CmsPageRow) => {
      try {
        await unpublishPage({ variables: { id: page.id } });
        notifySuccess(t('websiteApp.cms.pages.unpublishedToast'));
        refresh();
      } catch (error) {
        notifyError(cmsErrorMessage(error, t('websiteApp.cms.pages.publishFailed')));
      }
    },
    [refresh, t, unpublishPage],
  );

  const remove = useCallback(
    async (page: CmsPageRow) => {
      const ok = await confirm({
        title: t('websiteApp.cms.pages.deleteTitle'),
        message: t('websiteApp.cms.pages.deleteText', { vars: { title: page.title } }),
        confirmLabel: t('shell.common.delete'),
        destructive: true,
      });
      if (!ok) return;
      try {
        await deletePage({ variables: { id: page.id } });
        refresh();
      } catch (error) {
        notifyError(cmsErrorMessage(error, t('websiteApp.cms.pages.deleteFailed')));
      }
    },
    [confirm, deletePage, refresh, t],
  );

  return { publish, unpublish, remove };
}
