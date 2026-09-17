import { useId } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { Box, Drawer, Stack, Typography } from '@mui/material';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../i18n/useTranslation';
import { ABOVE_TASKBAR_HEIGHT } from '../workspace';
import type { BackgroundJobsApi } from './backgroundJobsContext';
import { isRunning } from './job-progress';
import { JobRow } from './JobRow';

export interface BackgroundJobsDrawerProps {
  open: boolean;
  onClose: () => void;
  api: BackgroundJobsApi;
}

/** Every process the header's ring stands for — running ones first, as the server lists them. */
export function BackgroundJobsDrawer({ open, onClose, api }: Readonly<BackgroundJobsDrawerProps>) {
  const { t } = useTranslation();
  const headingId = useId();
  const hasFinished = api.jobs.some((job) => !isRunning(job));

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          // A temporary Drawer's paper is already role=dialog; this names it. The
          // taskbar paints over a full-height paper, so it stops above the bar.
          'aria-labelledby': headingId,
          sx: { width: { xs: '100%', sm: 400 }, height: ABOVE_TASKBAR_HEIGHT },
        },
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', px: 2, pt: 2 }}>
        <Typography id={headingId} variant="h6" component="h2" sx={{ flex: 1 }}>
          {t('shell.jobs.title')}
        </Typography>
        <DuncitIconButton size="small" aria-label={t('shell.jobs.close')} onClick={onClose}>
          <CloseIcon fontSize="small" />
        </DuncitIconButton>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary', px: 2, pb: 1 }}>
        {t('shell.jobs.subtitle')}
      </Typography>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2 }}>
        {api.jobs.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', py: 3 }}>
            {t('shell.jobs.empty')}
          </Typography>
        ) : (
          api.jobs.map((job) => (
            <JobRow key={job.id} job={job} onCancel={api.cancel} onDismiss={api.dismiss} />
          ))
        )}
      </Box>
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <DuncitButton
          fullWidth
          variant="outlined"
          disabled={!hasFinished}
          onClick={api.clearFinished}
          data-testid="background-jobs-clear-finished"
        >
          {t('shell.jobs.clearFinished')}
        </DuncitButton>
      </Box>
    </Drawer>
  );
}
