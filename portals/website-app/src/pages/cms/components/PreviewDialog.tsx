import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, Dialog, DialogContent, DialogTitle, LinearProgress } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { CMS_PREVIEW, type CmsPreviewData } from '../queries/pages';
import { previewDocument } from '../lib/preview';

interface Props {
  pageId: string | null;
  title: string;
  onClose: () => void;
}

/**
 * A page's DRAFT, composed by the server exactly as the live site would serve
 * it (header, footer, fragments, bound collection fields), shown in a sandboxed
 * frame. Scripts do not run in it: the page's custom JS is for the live site,
 * not for the console.
 */
export default function PreviewDialog({ pageId, title, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<CmsPreviewData>(CMS_PREVIEW, {
    variables: { pageId },
    skip: !pageId,
    fetchPolicy: 'network-only',
  });
  const doc = useMemo(() => (data ? previewDocument(data.cmsPreview) : ''), [data]);

  return (
    <Dialog open={Boolean(pageId)} onClose={onClose} fullWidth maxWidth="xl">
      <DialogTitle>{t('websiteApp.cms.preview.title', { vars: { title } })}</DialogTitle>
      <DialogContent dividers sx={{ p: 0, height: '80vh' }}>
        {loading && <LinearProgress />}
        {error && <Alert severity="error">{t('websiteApp.cms.preview.failed')}</Alert>}
        {doc && (
          <Box
            component="iframe"
            title={t('websiteApp.cms.preview.frameTitle')}
            sandbox=""
            srcDoc={doc}
            sx={{ border: 0, width: '100%', height: '100%', display: 'block' }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
