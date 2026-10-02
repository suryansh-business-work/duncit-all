import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { ReelExport } from './useReelExport';

/**
 * The export in progress.
 *
 * Modal on purpose, and not dismissable by clicking away: the render runs in
 * this tab, so leaving the page or starting another edit would throw it away.
 * The only ways out are Cancel while it runs and Close once it has failed.
 */
export default function ExportDialog({ exporter }: Readonly<{ exporter: ReelExport }>) {
  const { t } = useTranslation();
  const { state, cancel, dismiss, start } = exporter;
  if (state.phase === 'idle') return null;
  const failed = state.phase === 'failed';
  const percent = failed ? 0 : Math.round(state.progress * 100);
  // The footage is fetched into the tab first, then the frames are drawn.
  const statusKey = state.phase === 'downloading' ? 'ai.reels.export.downloading' : 'ai.reels.export.progress';

  return (
    <Dialog open fullWidth maxWidth="xs" aria-labelledby="reel-export-title" data-testid="reel-export-dialog">
      <DialogTitle id="reel-export-title">{t('ai.reels.export.title')}</DialogTitle>
      <DialogContent>
        {failed ? (
          <Alert severity="error" data-testid="reel-export-error">
            {t('ai.reels.export.failedWith', { vars: { reason: state.message } })}
          </Alert>
        ) : (
          <Stack spacing={1.5}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('ai.reels.export.keepOpen')}
            </Typography>
            <LinearProgress variant="determinate" value={percent} aria-label={t('ai.reels.export.progressLabel')} />
            <Typography variant="caption" role="status" sx={{ color: 'text.secondary' }}>
              {t(statusKey, { vars: { percent } })}
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {failed ? (
          <>
            <DuncitButton onClick={dismiss} data-testid="reel-export-close">
              {t('shell.common.close')}
            </DuncitButton>
            <DuncitButton variant="contained" onClick={start} data-testid="reel-export-retry">
              {t('ai.reels.export.retry')}
            </DuncitButton>
          </>
        ) : (
          <DuncitButton onClick={cancel} data-testid="reel-export-cancel">
            {t('shell.common.cancel')}
          </DuncitButton>
        )}
      </DialogActions>
    </Dialog>
  );
}
