import { useId } from 'react';
import { Alert, Box, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';

/** What a failed push carries that is worth reading: the store's reason, and each step it took to get there. */
export interface FailedRelease {
  error: string;
  by?: string;
  started_at: string;
  finished_at: string | null;
  /** One line per step, each stamped with its time. Absent or empty when no log was kept. */
  log?: string[];
}

interface Props {
  open: boolean;
  /** Which build and where it was going, e.g. "DUN-BLD-000372 · Internal". */
  subject: string;
  release: FailedRelease;
  onClose: () => void;
}

/**
 * Why a push to a store failed: the reason on top, then the push's own step
 * log — which step it reached, how long each took and what went wrong there.
 */
export default function ReleaseLogDialog({ open, subject, release, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const log = release.log ?? [];
  const when = formatDateTime(release.finished_at ?? release.started_at);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth aria-labelledby={titleId} data-testid="release-log-dialog">
      <DialogTitle id={titleId}>
        {t('tech.appBuilds.releaseLogTitle')}
        <Typography variant="caption" component="p" sx={{ color: 'text.secondary' }}>
          {subject}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="error" data-testid="release-log-error">
            {release.error || t('tech.appBuilds.releaseLogNoReason')}
          </Alert>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {release.by
              ? t('tech.appBuilds.releaseLogMeta', { vars: { by: release.by, when } })
              : t('tech.appBuilds.releaseLogMetaAnon', { vars: { when } })}
          </Typography>
          {log.length === 0 ? (
            <Typography variant="body2" data-testid="release-log-empty">
              {t('tech.appBuilds.releaseLogEmpty')}
            </Typography>
          ) : (
            <Box
              component="ol"
              aria-label={t('tech.appBuilds.releaseLogSteps')}
              sx={{ m: 0, pl: 3, fontFamily: 'monospace', typography: 'caption', overflowX: 'auto' }}
              data-testid="release-log-lines"
            >
              {log.map((line, index) => (
                // Lines can repeat word for word (a retried part), so the position is part of the key.
                <Box component="li" key={`${index}-${line}`} sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {line}
                </Box>
              ))}
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
