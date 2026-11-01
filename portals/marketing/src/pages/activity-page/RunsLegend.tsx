import { useId } from 'react';
import { Paper, Stack, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useTranslation } from '@duncit/app-settings';
import { STATUSES } from './copy';
import RunStatusChip from './RunStatusChip';

/**
 * What the status colours mean, and how to get at a run's details. It sits
 * above the grid so a first-time reader has the key before the rows — and it
 * carries the anchors the page tour points at.
 */
export default function RunsLegend() {
  const { t } = useTranslation();
  const legendId = useId();
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }} data-testid="runs-legend">
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}
      >
        <Stack
          component="section"
          aria-labelledby={legendId}
          data-tour="runs-status"
          direction="row"
          useFlexGap
          sx={{ flexWrap: 'wrap', alignItems: 'center', gap: 0.75 }}
        >
          <Typography id={legendId} variant="caption" sx={{ color: 'text.secondary', mr: 0.5 }}>
            {t('marketing.runs.legendTitle')}
          </Typography>
          {STATUSES.map((status) => (
            <RunStatusChip key={status} status={status} />
          ))}
        </Stack>
        <Stack direction="row" spacing={1} data-tour="runs-details" sx={{ alignItems: 'center' }}>
          <InfoOutlinedIcon fontSize="small" color="action" aria-hidden />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('marketing.runs.legendDetails')}
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}
