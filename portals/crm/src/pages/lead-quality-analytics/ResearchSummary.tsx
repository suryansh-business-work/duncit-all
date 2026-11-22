import { Box, Stack, Typography } from '@mui/material';
import { useTranslation, type Translate } from '@duncit/shell';
import { CANDIDATE_STATUS_KEY, labelOf } from '../../lib/leadResearchLabels';
import { AnalyticsSection } from './AnalyticsSection';
import { formatScore, shareOf, type OriginRow, type QueueRow } from './analyticsData';
import { StatGrid, type StatItem } from './TypeOverview';

/** Research is a lead added from Lead Research; everything else was entered by hand. */
const ORIGINS = [
  { origin: 'RESEARCH', key: 'crm.leadQualityAnalytics.originResearch' },
  { origin: 'MANUAL', key: 'crm.leadQualityAnalytics.originManual' },
] as const;

const originItems = (t: Translate, origin: string, row: OriginRow | undefined): StatItem[] => {
  const leads = row?.leads ?? 0;
  const qualified = row?.qualified ?? 0;
  const rate = shareOf(qualified, leads);
  return [
    { key: `${origin}-leads`, label: t('crm.leadQualityAnalytics.leads'), value: leads },
    { key: `${origin}-average`, label: t('crm.leadQualityAnalytics.averageScore'), value: formatScore(row?.average_score) },
    { key: `${origin}-qualified`, label: t('crm.leadQuality.qualified'), value: qualified },
    { key: `${origin}-rate`, label: t('crm.leadQualityAnalytics.qualifiedRate'), value: rate === null ? formatScore(null) : t('crm.leadQualityAnalytics.percent', { vars: { value: rate } }) },
  ];
};

/** Researched leads against hand-entered ones: how many, how well they score, and how many qualify. */
export function OriginComparison({ origins }: Readonly<{ origins: readonly OriginRow[] }>) {
  const { t } = useTranslation();
  return (
    <AnalyticsSection title={t('crm.leadQualityAnalytics.originsTitle')} subtitle={t('crm.leadQualityAnalytics.originsHint')} testId="origins">
      <Stack spacing={2}>
        {ORIGINS.map(({ origin, key }) => (
          <Box key={origin}>
            <Typography component="h3" variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              {t(key)}
            </Typography>
            <StatGrid items={originItems(t, origin, origins.find((row) => row.origin === origin))} />
          </Box>
        ))}
      </Stack>
    </AnalyticsSection>
  );
}

/** The Lead Research review queue by status, with each status's average candidate score. */
export function ResearchQueueSummary({ queue }: Readonly<{ queue: readonly QueueRow[] }>) {
  const { t } = useTranslation();
  const items: StatItem[] = queue.map((row) => ({ key: `queue-${row.key}`, label: labelOf(t, CANDIDATE_STATUS_KEY, row.key), value: row.count }));
  return (
    <AnalyticsSection title={t('crm.leadQualityAnalytics.researchQueue')} subtitle={t('crm.leadQualityAnalytics.researchQueueHint')} testId="research-queue">
      {items.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('crm.leadQualityAnalytics.researchQueueEmpty')}
        </Typography>
      ) : (
        <Stack spacing={1}>
          <StatGrid items={items} />
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {queue.map((row) => (
              <Typography key={row.key} component="li" variant="caption" sx={{ color: 'text.secondary' }}>
                {t('crm.leadQualityAnalytics.queueAverage', { vars: { status: labelOf(t, CANDIDATE_STATUS_KEY, row.key), score: formatScore(row.average_score) } })}
              </Typography>
            ))}
          </Box>
        </Stack>
      )}
    </AnalyticsSection>
  );
}
