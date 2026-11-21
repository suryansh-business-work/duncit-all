import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, AlertTitle, Box, LinearProgress, MenuItem, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { parseApiError } from '@duncit/utils';
import { AI_PROMPT_ANALYTICS } from '../../detailQueries';
import type { PromptAnalytics } from '../../detailTypes';
import { PROMPT_PLATFORMS } from '../../share/platforms';
import { useDetailCopy } from '../../i18n/useDetailCopy';
import { BreakdownList } from './BreakdownList';

const RANGES = [7, 30, 90, 365] as const;

interface Props {
  promptId: string;
  totalHits: number;
  lastHitAt: string | null;
}

function Stat({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, flex: 1, minWidth: 0 }}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="h5" component="p" sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
    </Paper>
  );
}

/** Hits per day, one bar each; hovering (or focusing) a bar names its day and count. */
function DayBars({ days, title }: Readonly<{ days: PromptAnalytics['by_day']; title: string }>) {
  const copy = useDetailCopy();
  const { formatDate } = useDateFormat();
  if (days.length === 0) return null;
  const max = Math.max(...days.map((day) => day.count));
  return (
    <Box component="section" aria-label={title}>
      <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Stack direction="row" spacing={0.25} sx={{ alignItems: 'flex-end', height: (theme) => theme.spacing(12) }}>
        {days.map((day) => {
          const label = copy.analytics.dayBar(formatDate(day.day), day.count);
          return (
            <Tooltip key={day.day} title={label}>
              <Box
                role="img"
                aria-label={label}
                sx={{
                  flex: 1,
                  minWidth: 2,
                  height: `${Math.max(4, (day.count / max) * 100)}%`,
                  bgcolor: 'primary.main',
                  borderRadius: 1,
                }}
              />
            </Tooltip>
          );
        })}
      </Stack>
    </Box>
  );
}

const platformName = (key: string) => PROMPT_PLATFORMS.find((p) => p.id === key)?.name ?? key;

/** Who used this prompt, from where, on what, and how often. */
export function AnalyticsPanel({ promptId, totalHits, lastHitAt }: Readonly<Props>) {
  const copy = useDetailCopy();
  const { formatDateTime } = useDateFormat();
  const [range, setRange] = useState<number>(30);
  const { data, loading, error } = useQuery<{ aiPromptAnalytics: PromptAnalytics }>(AI_PROMPT_ANALYTICS, {
    variables: { id: promptId, range_days: range },
    fetchPolicy: 'network-only',
  });
  const stats = data?.aiPromptAnalytics;

  return (
    <Stack spacing={2} aria-busy={loading}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {copy.analytics.allTime(totalHits)}
          {lastHitAt ? ` · ${copy.analytics.lastHit(formatDateTime(lastHitAt))}` : ''}
        </Typography>
        <TextField
          select
          size="small"
          label={copy.analytics.range}
          value={range}
          onChange={(event) => setRange(Number(event.target.value))}
          sx={{ minWidth: 160 }}
        >
          {RANGES.map((days) => (
            <MenuItem key={days} value={days}>
              {copy.analytics.rangeOption(days)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      {loading && <LinearProgress aria-label={copy.analytics.range} />}
      {error && (
        <Alert severity="error">
          <AlertTitle>{copy.analytics.loadFailed}</AlertTitle>
          {parseApiError(error)}
        </Alert>
      )}
      {stats && stats.total_hits === 0 && <Typography variant="body2">{copy.analytics.empty}</Typography>}
      {stats && stats.total_hits > 0 && (
        <>
          <Stack direction="row" spacing={1}>
            <Stat label={copy.analytics.totalHits} value={stats.total_hits} />
            <Stat label={copy.analytics.uniqueVisitors} value={stats.unique_visitors} />
          </Stack>
          <DayBars days={stats.by_day} title={copy.analytics.byDay} />
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
            <BreakdownList title={copy.analytics.byType} rows={stats.by_type} labelOf={(key) => copy.analytics.types[key] ?? key} />
            <BreakdownList title={copy.analytics.byPlatform} rows={stats.by_platform} labelOf={platformName} />
            <BreakdownList title={copy.analytics.bySource} rows={stats.by_source} />
            <BreakdownList title={copy.analytics.byDevice} rows={stats.by_device} labelOf={(key) => copy.analytics.devices[key] ?? key} />
          </Box>
        </>
      )}
    </Stack>
  );
}
