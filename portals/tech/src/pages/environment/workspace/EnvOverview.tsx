import type { ReactNode } from 'react';
import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import KeyIcon from '@mui/icons-material/Key';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ScienceIcon from '@mui/icons-material/Science';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
import HubIcon from '@mui/icons-material/Hub';
import type { EnvOverview as Overview } from '@duncit/gql-types';
import { QueryGuard, StatCard } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import type { EnvCategoryDef } from '../queries';
import EnvTestHistoryList from './EnvTestHistoryList';

const RECENT_LIMIT = 10;

interface Props {
  overview: Overview | undefined;
  loading: boolean;
  error: { message: string } | undefined;
  categories: readonly EnvCategoryDef[];
  onOpen: (category: string) => void;
}

const percentOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

function Panel({ title, subtitle, children }: Readonly<{ title: string; subtitle: string; children: ReactNode }>) {
  return (
    <Card component="section" sx={{ flex: '1 1 320px', minWidth: 0 }}>
      <CardContent>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
          {subtitle}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

/** How many keys there are, how many are tested and passing, and what needs a look. */
export default function EnvOverview({ overview, loading, error, categories, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const o = overview;
  const total = o?.total ?? 0;
  const share = (n: number) => t('tech.environment.statShareHint', { vars: { percent: percentOf(n, total) } });
  const tiles = [
    { key: 'total', label: t('tech.environment.statTotal'), value: total, icon: <KeyIcon />, color: 'primary.main' },
    { key: 'active', label: t('tech.environment.statActive'), value: o?.active ?? 0, hint: share(o?.active ?? 0), icon: <ToggleOnIcon />, color: 'info.main' },
    { key: 'tested', label: t('tech.environment.statTested'), value: o?.tested ?? 0, hint: share(o?.tested ?? 0), icon: <ScienceIcon />, color: 'secondary.main' },
    { key: 'passing', label: t('tech.environment.statPassing'), value: o?.passing ?? 0, hint: share(o?.passing ?? 0), icon: <CheckCircleIcon />, color: 'success.main' },
    { key: 'failing', label: t('tech.environment.statFailing'), value: o?.failing ?? 0, hint: share(o?.failing ?? 0), icon: <ErrorIcon />, color: 'error.main' },
    { key: 'untested', label: t('tech.environment.statUntested'), value: o?.untested ?? 0, hint: share(o?.untested ?? 0), icon: <HelpOutlineIcon />, color: 'warning.main' },
    {
      key: 'services',
      label: t('tech.environment.statServices'),
      value: o?.services_ready ?? 0,
      hint: t('tech.environment.statServicesHint', { vars: { ready: o?.services_ready ?? 0, total: o?.services ?? 0 } }),
      icon: <HubIcon />,
      color: 'primary.main',
    },
  ];
  const labels = new Map(categories.map((c) => [c.category as string, c.label]));
  const attention = (o?.categories ?? []).filter((c) => c.failing > 0 || c.untested > 0);

  return (
    <Stack spacing={2} data-testid="env-overview">
      <QueryGuard loading={loading && !overview} error={error} errorText={error?.message}>
        <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' } }}>
          {tiles.map((tile) => (
            <StatCard
              key={tile.key}
              label={tile.label}
              value={tile.value}
              hint={tile.hint}
              icon={tile.icon}
              iconColor={tile.color}
              testId={`env-stat-${tile.key}`}
            />
          ))}
        </Box>
      </QueryGuard>
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ alignItems: 'stretch' }}>
        <Panel title={t('tech.environment.needsAttention')} subtitle={t('tech.environment.needsAttentionSubtitle')}>
          {attention.length === 0 ? (
            <Typography variant="body2" role="status" sx={{ color: 'success.main' }}>
              {t('tech.environment.allHealthy')}
            </Typography>
          ) : (
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {attention.map((c) => (
                <Chip
                  key={c.category}
                  clickable
                  onClick={() => onOpen(c.category)}
                  color={c.failing > 0 ? 'error' : 'warning'}
                  variant="outlined"
                  icon={c.failing > 0 ? <ErrorIcon /> : <HelpOutlineIcon />}
                  label={`${labels.get(c.category) ?? c.category} · ${
                    c.failing > 0
                      ? t('tech.environment.failingCount', { vars: { count: c.failing } })
                      : t('tech.environment.categoryCounts', { vars: { total: c.total, tested: c.tested } })
                  }`}
                />
              ))}
            </Stack>
          )}
        </Panel>
        <Panel title={t('tech.environment.recentTests')} subtitle={t('tech.environment.recentTestsSubtitle')}>
          <EnvTestHistoryList limit={RECENT_LIMIT} showEntry />
        </Panel>
      </Stack>
    </Stack>
  );
}
