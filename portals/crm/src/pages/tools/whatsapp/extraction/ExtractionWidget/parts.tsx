import { Box, Chip, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTranslation } from '@duncit/shell';
import type { WaExtraction } from '../../whatsappQueries';
import { barColorFor, spin, statusColor, statusTitleKey } from './status';

/** Collapsed state — a floating status chip that reopens the widget. */
export function MinimizedChip({ job, pct, onOpen }: Readonly<{ job: WaExtraction; pct: number; onOpen: () => void }>) {
  const { t } = useTranslation();
  const running = job.status === 'RUNNING';
  const title = t(statusTitleKey(job.status));
  return (
    <Tooltip title={running ? t('crm.tools.extractingPercentHint', { vars: { pct } }) : title}>
      <Chip
        icon={
          running ? (
            <SyncIcon sx={{ animation: `${spin} 1.2s linear infinite` }} />
          ) : (
            <InfoOutlinedIcon />
          )
        }
        color={statusColor(job.status)}
        label={running ? t('crm.tools.extractingPercent', { vars: { pct } }) : title}
        onClick={onOpen}
        sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1300, boxShadow: 4, cursor: 'pointer' }}
      />
    </Tooltip>
  );
}

export function ProgressSection({ job, running, pct }: Readonly<{ job: WaExtraction; running: boolean; pct: number }>) {
  const { t } = useTranslation();
  let caption = t('crm.tools.contactsProcessed', { count: job.processed });
  if (running && job.total > 0) {
    caption = t('crm.tools.contactsProgress', { vars: { processed: job.processed, total: job.total, pct } });
  } else if (running) {
    caption = t('crm.tools.contactsProgressUnknown', { vars: { processed: job.processed, pct } });
  }
  return (
    <Box sx={{ px: 1.5 }}>
      {running && job.total === 0 ? (
        <LinearProgress sx={{ borderRadius: 1 }} />
      ) : (
        <LinearProgress variant="determinate" value={running ? pct : 100} color={barColorFor(job.status)} sx={{ borderRadius: 1 }} />
      )}
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {caption}
      </Typography>
    </Box>
  );
}

export function StatRow({ job }: Readonly<{ job: WaExtraction }>) {
  const { t } = useTranslation();
  const stats: [string, string][] = [
    [t('crm.tools.validCount', { count: job.valid }), 'success.main'],
    [t('crm.tools.invalidCount', { count: job.invalid }), 'error.main'],
    [t('crm.tools.duplicatesCount', { count: job.duplicates }), 'warning.main'],
    [t('crm.tools.newLeadsCount', { count: job.leads_created }), 'primary.main'],
  ];
  return (
    <Stack
      direction="row"
      sx={{
        flexWrap: "wrap",
        gap: 0.75
      }}>
      {stats.map(([label, color]) => (
        <Chip key={label} size="small" variant="outlined" label={label} sx={{ color, borderColor: color }} />
      ))}
    </Stack>
  );
}
