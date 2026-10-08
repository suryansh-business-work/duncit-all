import { useMemo } from 'react';
import { useLazyQuery, useQuery } from '@apollo/client/react';
import { Alert, Box, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitButton } from '@duncit/buttons';
import { notifyError } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { CMS_PREVIEW, CMS_PREVIEW_LINK, type CmsPreviewData, type CmsPreviewLinkData } from '../queries/pages';
import { previewDocument } from '../lib/preview';
import { cmsErrorMessage } from '../lib/errors';

interface Props {
  pageId: string | null;
  title: string;
  onClose: () => void;
}

/**
 * A page's DRAFT as the live site renders it: its signed preview link, framed —
 * live blocks (reel slider, earn showcase, newsletter…) and scripts included,
 * running on the site's own domain, never the console's. A site that cannot
 * be previewed on a domain (none added yet) falls back to the server-composed
 * html in a script-less frame, where live blocks are labelled outlines.
 * "Open on site" shows the same draft in its own tab.
 */
export default function PreviewDialog({ pageId, title, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const link = useQuery<CmsPreviewLinkData>(CMS_PREVIEW_LINK, { variables: { pageId }, skip: !pageId, fetchPolicy: 'network-only' });
  const liveUrl = link.data?.cmsPreviewLink.url;
  const { data, loading, error } = useQuery<CmsPreviewData>(CMS_PREVIEW, {
    variables: { pageId },
    skip: !pageId || !link.error,
    fetchPolicy: 'network-only',
  });
  const [fetchLink, { loading: linking }] = useLazyQuery<CmsPreviewLinkData>(CMS_PREVIEW_LINK, { fetchPolicy: 'network-only' });
  const doc = useMemo(() => (data ? previewDocument(data.cmsPreview) : ''), [data]);

  const openOnSite = () => {
    if (!pageId) return;
    // Opened inside the click so no popup blocker stops it; pointed at the link once it is signed.
    const tab = window.open('', '_blank');
    if (tab) tab.opener = null;
    fetchLink({ variables: { pageId } })
      .then((result) => {
        const url = result.data?.cmsPreviewLink.url;
        if (!url) throw result.error ?? new Error('no preview link');
        if (tab) tab.location.href = url;
        else window.open(url, '_blank', 'noopener');
      })
      .catch((failure: unknown) => {
        tab?.close();
        notifyError(cmsErrorMessage(failure, t('websiteApp.cms.preview.openFailed')));
      });
  };

  return (
    <Dialog open={Boolean(pageId)} onClose={onClose} fullWidth maxWidth="xl">
      <DialogTitle>{t('websiteApp.cms.preview.title', { vars: { title } })}</DialogTitle>
      <DialogContent dividers sx={{ p: 0, height: '80vh' }}>
        {(link.loading || loading) && <LinearProgress />}
        {error && <Alert severity="error">{t('websiteApp.cms.preview.failed')}</Alert>}
        {liveUrl && (
          <Box
            component="iframe"
            title={t('websiteApp.cms.preview.frameTitle')}
            // Another origin, so its scripts never reach the console; it may not navigate the console away.
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            src={liveUrl}
            sx={{ border: 0, width: '100%', height: '100%', display: 'block' }}
          />
        )}
        {!liveUrl && doc && (
          <Box
            component="iframe"
            title={t('websiteApp.cms.preview.frameTitle')}
            sandbox=""
            srcDoc={doc}
            sx={{ border: 0, width: '100%', height: '100%', display: 'block' }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <DuncitButton startIcon={<OpenInNewIcon />} loading={linking} onClick={openOnSite} data-testid="cms-preview-open-on-site">
          {t('websiteApp.cms.preview.openOnSite')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
