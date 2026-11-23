import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import type { QueryCrmLeadQualityAnalyticsArgs } from '@duncit/gql-types';
import { formatDateTime } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { fireAndForget, logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { DuncitTabs, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { EmptyState, PageHeader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { LEAD_QUALITY_ANALYTICS, type LeadQualityAnalytics } from '../../api/leadQuality.gql';
import { LEAD_TYPES } from '../../components/lead-quality/qualityLabels';
import { LEAD_KIND_LABEL_KEY } from '../../lib/leadKinds';
import AnalyticsContent from './AnalyticsContent';
import { ALL_TYPES, isEmptyAnalytics, type AnalyticsType } from './analyticsData';

const TAB_PREFIX = 'lead-quality-analytics';

/**
 * CRM › Quality Analytics: how CRM leads score with the published Lead Quality
 * model — per lead type or all five — from the scores stored on the leads.
 * Nothing here is estimated; an empty type says so instead of showing zeros.
 */
export default function LeadQualityAnalyticsPage() {
  const { t } = useTranslation();
  const items = useMemo<DuncitTabItem<AnalyticsType>[]>(
    () => [
      { value: ALL_TYPES, label: t('crm.leadQualityAnalytics.allTypes'), testId: 'analytics-type-ALL' },
      ...LEAD_TYPES.map((type) => ({ value: type, label: t(LEAD_KIND_LABEL_KEY[type]), testId: `analytics-type-${type}` })),
    ],
    [t]
  );
  const tabs = useTabParam({ items, fallback: ALL_TYPES });
  const { data, loading, error, refetch } = useQuery<{ crmLeadQualityAnalytics: LeadQualityAnalytics }, QueryCrmLeadQualityAnalyticsArgs>(
    LEAD_QUALITY_ANALYTICS,
    { variables: { entity_type: tabs.value === ALL_TYPES ? null : tabs.value } }
  );
  const analytics = data?.crmLeadQualityAnalytics;
  const reload = () => fireAndForget(refetch(), logs.portal.crm, 'LeadQualityAnalytics', 'reload');

  return (
    <Stack spacing={2}>
      <PageHeader
        title={
          <Stack component="span" direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <InsightsIcon color="primary" aria-hidden />
            <span>{t('crm.leadQualityAnalytics.title')}</span>
          </Stack>
        }
        subtitle={t('crm.leadQualityAnalytics.subtitle')}
        titleWeight={800}
      />
      <DuncitTabs {...tabs} idPrefix={TAB_PREFIX} searchable={false} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile />
      <Box {...tabPanelProps(TAB_PREFIX, tabs.value)} aria-busy={loading}>
        {error ? (
          <Alert
            severity="error"
            action={
              <DuncitButton color="inherit" size="small" onClick={reload}>
                {t('shell.common.retry')}
              </DuncitButton>
            }
          >
            {parseApiError(error)}
          </Alert>
        ) : null}
        {loading && !analytics ? (
          <Stack sx={{ alignItems: 'center', py: 6 }}>
            <CircularProgress aria-label={t('crm.leadQualityAnalytics.loading')} />
          </Stack>
        ) : null}
        {analytics && isEmptyAnalytics(analytics) ? (
          <EmptyState
            icon={<InsightsIcon />}
            title={t('crm.leadQualityAnalytics.emptyTitle')}
            body={t('crm.leadQualityAnalytics.emptyBody')}
            data-testid="analytics-empty"
          />
        ) : null}
        {analytics && !isEmptyAnalytics(analytics) ? (
          <Stack spacing={1}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('crm.leadQualityAnalytics.generatedAt', { vars: { date: formatDateTime(analytics.generated_at) } })}
            </Typography>
            <AnalyticsContent data={analytics} />
          </Stack>
        ) : null}
      </Box>
    </Stack>
  );
}
