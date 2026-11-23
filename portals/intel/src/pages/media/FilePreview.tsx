import { useEffect, useState } from 'react';
import { Alert, Box, Skeleton } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { intelLog } from '../../lib/logger';
import { fileObjectUrl } from '../../lib/rest';

/**
 * A private file shown in place: the bytes are fetched with the person's token
 * (never a public URL) and released when the preview closes.
 */
export default function FilePreview({ id, mime, name }: Readonly<{ id: string; mime: string; name: string }>) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let created: string | null = null;
    let cancelled = false;
    fileObjectUrl(id)
      .then(async (objectUrl) => {
        created = objectUrl;
        if (cancelled) return;
        if (mime.startsWith('text/')) setText((await (await fetch(objectUrl)).text()).slice(0, 20_000));
        else setUrl(objectUrl);
      })
      .catch((error) => {
        intelLog.warn('/media', 'FilePreview', { error });
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [id, mime]);

  if (failed) return <Alert severity="warning">{t('intel.media.previewFailed')}</Alert>;
  if (text !== null)
    return (
      <Box component="pre" sx={{ m: 0, p: 1.5, bgcolor: 'action.hover', borderRadius: 1.5, maxHeight: 360, overflow: 'auto', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
        {text}
      </Box>
    );
  if (!url) return <Skeleton variant="rounded" height={280} />;
  if (mime.startsWith('image/')) return <Box component="img" src={url} alt={name} sx={{ maxWidth: '100%', maxHeight: 420, borderRadius: 1.5, display: 'block', mx: 'auto' }} />;
  return <Box component="iframe" src={url} title={name} sx={{ width: '100%', height: 420, border: 0, borderRadius: 1.5 }} />;
}
