import SendIcon from '@mui/icons-material/Send';
import DownloadIcon from '@mui/icons-material/Download';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { ExportView } from './exportView';
import type { ReelExport } from './useReelExport';
import type { ReelPost } from './useReelPost';

interface Props {
  view: Exclude<ExportView, { kind: 'hidden' }>;
  exporter: ReelExport;
  poster: ReelPost;
}

/**
 * The dialog's buttons, one set per state: Cancel while the render runs,
 * nothing while the upload does, Save or Post once the reel is rendered, and
 * Close or Try again after a failure. A failed upload goes back to the
 * rendered reel, which can still be saved.
 */
export default function ExportActions({ view, exporter, poster }: Readonly<Props>) {
  const { t } = useTranslation();

  // Posting closes the export once the composer is open — the reel is in its hands then.
  const post = async (file: File) => {
    if (await poster.post(file)) exporter.dismiss();
  };

  if (view.kind === 'busy') {
    if (!view.cancellable) return null;
    return (
      <DuncitButton onClick={exporter.cancel} data-testid="reel-export-cancel">
        {t('shell.common.cancel')}
      </DuncitButton>
    );
  }

  if (view.kind === 'failed') {
    const { file } = view;
    return (
      <>
        <DuncitButton onClick={file ? poster.dismiss : exporter.dismiss} data-testid="reel-export-close">
          {t('shell.common.close')}
        </DuncitButton>
        <DuncitButton variant="contained" onClick={file ? () => post(file) : exporter.start} data-testid="reel-export-retry">
          {t('ai.reels.export.retry')}
        </DuncitButton>
      </>
    );
  }

  return (
    <>
      <DuncitButton onClick={exporter.dismiss} data-testid="reel-export-close">
        {t('shell.common.close')}
      </DuncitButton>
      <DuncitButton startIcon={<DownloadIcon />} onClick={exporter.save} data-testid="reel-export-save">
        {t('shell.common.save')}
      </DuncitButton>
      <DuncitButton variant="contained" startIcon={<SendIcon />} onClick={() => post(view.file)} data-testid="reel-export-post">
        {t('ai.reels.export.postToSocial')}
      </DuncitButton>
    </>
  );
}
