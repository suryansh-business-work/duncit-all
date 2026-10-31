import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import ExportActions from './ExportActions';
import { exportView, type ExportView } from './exportView';
import type { ReelExport } from './useReelExport';
import type { ReelPost } from './useReelPost';

interface Props {
  exporter: ReelExport;
  poster: ReelPost;
}

/** The dialog's middle: the failure, the two ways out of a rendered reel, or the bar. */
function ExportBody({ view }: Readonly<{ view: Exclude<ExportView, { kind: 'hidden' }> }>) {
  const { t } = useTranslation();
  if (view.kind === 'failed') {
    const key = view.file ? 'ai.reels.export.postFailedWith' : 'ai.reels.export.failedWith';
    return (
      <Alert severity="error" data-testid="reel-export-error">
        {t(key, { vars: { reason: view.message } })}
      </Alert>
    );
  }
  if (view.kind === 'ready') {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid="reel-export-ready">
        {t('ai.reels.export.readyHint')}
      </Typography>
    );
  }
  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('ai.reels.export.keepOpen')}
      </Typography>
      <LinearProgress variant="determinate" value={view.percent} aria-label={t(view.labelKey)} />
      <Typography variant="caption" role="status" sx={{ color: 'text.secondary' }}>
        {t(view.statusKey, { vars: { percent: view.percent } })}
      </Typography>
    </Stack>
  );
}

/**
 * The export, from the first frame to the rendered reel.
 *
 * Modal on purpose, and not dismissable by clicking away: the render runs in
 * this tab, so leaving the page or starting another edit would throw it away.
 * Once the reel is rendered it waits here to be saved, or posted to social —
 * the upload then shows in the same bar, and the composer opens when it lands.
 */
export default function ExportDialog({ exporter, poster }: Readonly<Props>) {
  const { t } = useTranslation();
  const view = exportView(exporter.state, poster.state);
  if (view.kind === 'hidden') return null;

  return (
    <Dialog open fullWidth maxWidth="xs" aria-labelledby="reel-export-title" data-testid="reel-export-dialog">
      <DialogTitle id="reel-export-title">{t(view.kind === 'ready' ? 'ai.reels.export.ready' : 'ai.reels.export.title')}</DialogTitle>
      <DialogContent>
        <ExportBody view={view} />
      </DialogContent>
      <DialogActions>
        <ExportActions view={view} exporter={exporter} poster={poster} />
      </DialogActions>
    </Dialog>
  );
}
