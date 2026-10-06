import { useCallback, useMemo } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { copyToClipboard } from '@duncit/utils';
import { CMS_PREVIEW_LINK, type CmsPreviewLinkData } from '../queries/pages';
import { CMS_COMPONENT_PREVIEW_LINK, type CmsComponentPreviewLinkData } from '../queries/fragments';
import { cmsErrorMessage } from './errors';

/**
 * Copies a draft's live-demo link — the page (or the component on its own) on
 * the site's domain behind a signed, short-lived preview flag.
 */
export function useCopyPreviewLink() {
  const client = useApolloClient();
  const { t } = useTranslation();

  const copy = useCallback(
    (sign: () => Promise<string | undefined>) => {
      sign()
        .then((url) => {
          if (!url) throw new Error('no preview link');
          return copyToClipboard(url);
        })
        .then((copied) => (copied ? notifySuccess(t('websiteApp.cms.preview.linkCopied')) : notifyError(t('websiteApp.cms.preview.copyFailed'))))
        .catch((failure: unknown) => notifyError(cmsErrorMessage(failure, t('websiteApp.cms.preview.copyFailed'))));
    },
    [t],
  );

  return useMemo(
    () => ({
      page: (pageId: string) =>
        copy(() =>
          client
            .query<CmsPreviewLinkData>({ query: CMS_PREVIEW_LINK, variables: { pageId }, fetchPolicy: 'network-only' })
            .then((result) => result.data?.cmsPreviewLink.url),
        ),
      component: (id: string) =>
        copy(() =>
          client
            .query<CmsComponentPreviewLinkData>({ query: CMS_COMPONENT_PREVIEW_LINK, variables: { id }, fetchPolicy: 'network-only' })
            .then((result) => result.data?.cmsComponentPreviewLink.url),
        ),
    }),
    [client, copy],
  );
}
