import { useState } from 'react';
import { Box, Paper, Stack, Tooltip, Typography } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import CloseIcon from '@mui/icons-material/Close';
import MinimizeIcon from '@mui/icons-material/Minimize';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { DuncitIconButton } from '@duncit/buttons';
import { logs } from '@duncit/logs';
import { useExtraction } from '../ExtractionContext';
import { useTranslation } from '@duncit/shell';
import { STATUS_TITLE, spin } from './status';
import { MinimizedChip, ProgressSection, StatRow } from './parts';
import StatsDialog from './StatsDialog';

/** Global, minimizable extraction progress widget (bottom-right). */
export default function ExtractionWidget() {
  const { t } = useTranslation();
  const { job, open, setOpen, cancel } = useExtraction();
  const [hiddenId, setHiddenId] = useState<string | null>(null);
  const [details, setDetails] = useState(false);

  if (!job || job.id === hiddenId) return null;
  const running = job.status === 'RUNNING';
  const pct = job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0;
  const title = STATUS_TITLE[job.status];

  if (!open) {
    return <MinimizedChip job={job} pct={pct} onOpen={() => setOpen(true)} />;
  }

  return (
    <Paper
      elevation={8}
      sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1300, width: 320, borderRadius: 3, overflow: 'hidden' }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          p: 1.5,
          pb: 1
        }}>
        {running ? (
          <SyncIcon color="warning" sx={{ animation: `${spin} 1.2s linear infinite` }} />
        ) : (
          <SyncIcon color={job.status === 'FAILED' ? 'error' : 'success'} />
        )}
        <Typography
          noWrap
          sx={{
            fontWeight: 800,
            flex: 1
          }}>
          {title}
        </Typography>
        <Tooltip title={t('crm.tools.details')}>
          <DuncitIconButton size="small" onClick={() => setDetails(true)}><InfoOutlinedIcon fontSize="small" /></DuncitIconButton>
        </Tooltip>
        <Tooltip title={t('crm.tools.minimize')}>
          <DuncitIconButton size="small" onClick={() => setOpen(false)}><MinimizeIcon fontSize="small" /></DuncitIconButton>
        </Tooltip>
        <Tooltip title={running ? 'Cancel extraction' : 'Dismiss'}>
          <DuncitIconButton
            size="small"
            color={running ? 'error' : 'default'}
            onClick={() => {
              if (running)
                cancel().catch((error) =>
                  logs.portal['crm'].error('ExtractionWidget', 'cancel', {
                    error,
                    msg: 'Failed to cancel extraction',
                    jobId: job.id,
                  }),
                );
              else setHiddenId(job.id);
            }}
          >
            <CloseIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
      </Stack>

      <ProgressSection job={job} running={running} pct={pct} />

      <Box sx={{ p: 1.5, pt: 1 }}>
        {job.status === 'FAILED' ? (
          <Typography variant="body2" color="error" role="alert">{job.error || 'Extraction failed.'}</Typography>
        ) : (
          <StatRow job={job} />
        )}
      </Box>

      <StatsDialog job={job} open={details} onClose={() => setDetails(false)} />
    </Paper>
  );
}
