import { useId } from 'react';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { LEAD_KIND_LABEL_KEY } from '../../lib/leadKinds';
import AverageScoreRing from './AverageScoreRing';
import type { TypeStats } from './analyticsData';

export interface StatItem {
  key: string;
  label: string;
  value: number | string;
}

/** Labelled numbers in a responsive grid (a description list, so each value is read with its name). */
export function StatGrid({ items }: Readonly<{ items: readonly StatItem[] }>) {
  return (
    <Box
      component="dl"
      sx={{ m: 0, display: 'grid', gridTemplateColumns: (theme) => `repeat(auto-fill, minmax(min(100%, ${theme.spacing(17)}), 1fr))`, gap: 1.5 }}
    >
      {items.map((item) => (
        <Box key={item.key} sx={{ p: 1.25, borderRadius: 1, bgcolor: 'action.hover' }}>
          <Typography component="dt" variant="caption" sx={{ color: 'text.secondary' }}>
            {item.label}
          </Typography>
          <Typography component="dd" variant="h6" sx={{ m: 0, fontWeight: 700, lineHeight: 1.3 }} data-testid={`stat-${item.key}`}>
            {item.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function TypeCard({ stats }: Readonly<{ stats: TypeStats }>) {
  const { t } = useTranslation();
  const headingId = useId();
  const items: StatItem[] = [
    { key: `${stats.entity_type}-total`, label: t('crm.common.totalLeads'), value: stats.total },
    { key: `${stats.entity_type}-qualified`, label: t('crm.leadQuality.qualified'), value: stats.qualified },
    { key: `${stats.entity_type}-not-qualified`, label: t('crm.leadQuality.notQualified'), value: stats.not_qualified },
    { key: `${stats.entity_type}-pending`, label: t('crm.leadQuality.pendingVerification'), value: stats.pending_verification },
    { key: `${stats.entity_type}-failed-gates`, label: t('crm.leadQualityAnalytics.failedGateLeads'), value: stats.failed_gate_leads },
    { key: `${stats.entity_type}-pending-items`, label: t('crm.leadQualityAnalytics.pendingItems'), value: stats.pending_items },
  ];
  return (
    <Card variant="outlined" component="section" aria-labelledby={headingId} data-testid={`type-card-${stats.entity_type}`}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <AverageScoreRing score={stats.average_score} />
            <Box sx={{ minWidth: 0 }}>
              <Typography id={headingId} component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>
                {t(LEAD_KIND_LABEL_KEY[stats.entity_type])}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('crm.leadQualityAnalytics.scoredOf', { vars: { scored: stats.scored, total: stats.total } })}
              </Typography>
            </Box>
          </Stack>
          <StatGrid items={items} />
        </Stack>
      </CardContent>
    </Card>
  );
}

/** One card per lead type: its average score, how many are scored, and how they qualify. */
export default function TypeOverview({ stats }: Readonly<{ stats: readonly TypeStats[] }>) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
      {stats.map((entry) => (
        <TypeCard key={entry.entity_type} stats={entry} />
      ))}
    </Box>
  );
}
