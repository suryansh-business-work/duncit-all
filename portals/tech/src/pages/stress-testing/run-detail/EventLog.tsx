import { useMemo } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { formatDateTime } from '../../server/format';
import SectionCard from '../components/SectionCard';
import type { StressEvent } from '../queries';

const LEVEL_COLOR: Record<StressEvent['level'], 'default' | 'warning' | 'error'> = {
  INFO: 'default',
  WARN: 'warning',
  ERROR: 'error',
};

interface Props {
  events: readonly StressEvent[];
}

/**
 * The run's log, newest first — who started it, each runner claiming its shard,
 * the errors the bots hit, the guardrail that tripped, how it ended. It is kept
 * on the run itself, so it outlives the GitHub run log.
 */
export default function EventLog({ events }: Readonly<Props>) {
  const { t } = useTranslation();
  const ordered = useMemo(() => [...events].reverse(), [events]);

  return (
    <SectionCard title={t('tech.stress.logTitle')} subtitle={t('tech.stress.logSubtitle', { vars: { count: events.length } })}>
      {ordered.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('tech.stress.logEmpty')}
        </Typography>
      ) : (
        <Box sx={{ maxHeight: 420, overflowY: 'auto', fontFamily: 'monospace' }} role="log" aria-live="polite">
          <Stack spacing={0.75}>
            {ordered.map((event) => (
              <Stack
                key={`${event.at}|${event.source}|${event.message}`}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{ alignItems: { sm: 'baseline' } }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 150, fontFamily: 'inherit' }}>
                  {formatDateTime(event.at)}
                </Typography>
                <Chip size="small" color={LEVEL_COLOR[event.level] ?? 'default'} label={event.level} sx={{ minWidth: 64 }} />
                <Typography variant="caption" sx={{ color: 'text.secondary', minWidth: 80, fontFamily: 'inherit' }}>
                  {event.source}
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'inherit', wordBreak: 'break-word' }}>
                  {event.message}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}
    </SectionCard>
  );
}
