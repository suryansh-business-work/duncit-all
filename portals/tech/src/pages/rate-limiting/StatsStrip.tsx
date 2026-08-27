import { useQuery } from '@apollo/client';
import { Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MemoryIcon from '@mui/icons-material/Memory';
import { StatCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { STATS } from './queries';
import { enumLabel } from './labels';

interface Tally {
  label: string;
  count: number;
}

interface Stats {
  store: string;
  blocked_24h: number;
  monitored_24h: number;
  top_rules: Tally[];
  top_systems: Tally[];
}

/** A tally row as chips, or a dash when the last day produced nothing. */
function TallyChips({ items, empty }: Readonly<{ items: Tally[]; empty: string }>) {
  if (items.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {empty}
      </Typography>
    );
  }
  return (
    <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
      {items.map((item) => (
        <Chip key={item.label} size="small" label={`${item.label} · ${item.count}`} />
      ))}
    </Stack>
  );
}

/**
 * The last 24 hours, above every page in this section.
 *
 * The store engine sits here rather than only in Settings on purpose: MEMORY
 * means each server process counts on its own, and reading a rule's numbers
 * without knowing that is how somebody concludes a limit "isn't working".
 */
export default function StatsStrip() {
  const { t } = useTranslation();
  const { data } = useQuery<{ rateLimitStats: Stats }>(STATS, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 30_000,
  });
  const stats = data?.rateLimitStats;
  const memoryStore = stats?.store === 'MEMORY';

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
        }}
      >
        <StatCard
          label={t('tech.rateLimit.stats.refused24h')}
          value={stats?.blocked_24h ?? 0}
          hint={t('tech.rateLimit.stats.refusedHint')}
          icon={<BlockIcon fontSize="small" />}
          iconColor="error.main"
        />
        <StatCard
          label={t('tech.rateLimit.stats.recorded24h')}
          value={stats?.monitored_24h ?? 0}
          hint={t('tech.rateLimit.stats.recordedHint')}
          icon={<VisibilityIcon fontSize="small" />}
          iconColor="warning.main"
        />
        <Tooltip
          title={memoryStore ? t('tech.rateLimit.stats.memoryWarning') : ''}
          disableHoverListener={!memoryStore}
        >
          <Box>
            <StatCard
              label={t('tech.rateLimit.stats.counterStore')}
              value={enumLabel(t, stats?.store ?? 'MEMORY')}
              hint={
                memoryStore
                  ? t('tech.rateLimit.stats.perProcess')
                  : t('tech.rateLimit.stats.sharedAcrossProcesses')
              }
              hintColor={memoryStore ? 'warning.main' : 'success.main'}
              icon={<MemoryIcon fontSize="small" />}
              iconColor={memoryStore ? 'warning.main' : 'success.main'}
            />
          </Box>
        </Tooltip>
      </Box>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        sx={{ gap: 3, flexWrap: 'wrap', alignItems: { md: 'center' } }}
      >
        <Stack sx={{ gap: 0.5 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            {t('tech.rateLimit.stats.topRules')}
          </Typography>
          <TallyChips
            items={stats?.top_rules ?? []}
            empty={t('tech.rateLimit.stats.nothingBreached')}
          />
        </Stack>
        <Stack sx={{ gap: 0.5 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            {t('tech.rateLimit.stats.topSystems')}
          </Typography>
          <TallyChips
            items={stats?.top_systems ?? []}
            empty={t('tech.rateLimit.stats.nothingBreached')}
          />
        </Stack>
      </Stack>
    </Stack>
  );
}
