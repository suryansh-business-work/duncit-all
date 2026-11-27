import { useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { useTheme } from 'tamagui';
import type { CrmDashboardRange, CrmDateWindow } from '@duncit/utils';

import { StateView } from '@/components/StateView';
import { useDashboard } from '@/features/dashboard/useDashboard';
import { useTranslation } from '@/hooks/useTranslation';
import { BarChartCard } from '@/components/BarChartCard';
import { KpiGrid } from '@/components/KpiGrid';
import { DashboardRangePicker } from './DashboardRangePicker';

/**
 * The CRM portal's Dashboard: venue and host leads for a date range — the KPI
 * tiles, leads by stage, by priority, by super category and the services mix,
 * counted by the same shared functions as the portal.
 */
export function DashboardScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [range, setRange] = useState<CrmDashboardRange>('month');
  const [custom, setCustom] = useState<CrmDateWindow>({});
  const d = useDashboard(
    range,
    {
      uncategorised: t('crmApp.dashboard.uncategorised'),
      loadFailed: t('crmApp.common.loadFailed'),
    },
    custom,
  );
  const venueColor = theme.accentText?.val ?? '';
  const hostColor = theme.info?.val ?? '';
  const legend = [
    { label: t('crmApp.dashboard.venue'), color: venueColor },
    { label: t('crmApp.dashboard.host'), color: hostColor },
  ];
  const split = (venue: number, host: number) =>
    t('crmApp.dashboard.split', { vars: { venue, host } });

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 12 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={d.refetch} />}
    >
      <DashboardRangePicker range={range} onRange={setRange} custom={custom} onCustom={setCustom} />
      {d.loading || d.error ? (
        <StateView loading={d.loading} error={d.error} onRetry={d.refetch} />
      ) : (
        <>
          <KpiGrid
            items={[
              {
                key: 'venue',
                label: t('shell.nav.venueLeads'),
                value: String(d.totals.venue),
                icon: 'location-on',
                tone: 'accentText',
              },
              {
                key: 'host',
                label: t('shell.nav.hostLeads'),
                value: String(d.totals.host),
                icon: 'groups',
                tone: 'info',
              },
              {
                key: 'total',
                label: t('crm.common.totalLeads'),
                value: String(d.totals.total),
                icon: 'assessment',
                tone: 'success',
              },
              {
                key: 'won',
                label: t('crm.dashboard.won'),
                value: `${d.totals.conversionRate.toFixed(0)}%`,
                icon: 'trending-up',
                tone: 'warning',
              },
              {
                key: 'services',
                label: t('shell.nav.servicesOffered'),
                value: String(d.services.serviceTotals.uniqueServices),
                icon: 'contacts',
                tone: 'accentText',
              },
            ]}
          />
          <BarChartCard
            title={t('crm.dashboard.leadsByStage')}
            caption={t('crmApp.dashboard.stageCaption')}
            legend={legend}
            empty={t('crmApp.dashboard.empty')}
            testID="chart-stage"
            rows={d.stages.map((s) => ({
              key: s.stage,
              label: s.stage,
              segments: [
                { key: 'venue', value: s.venue, color: venueColor },
                { key: 'host', value: s.host, color: hostColor },
              ],
              description: `${s.stage}: ${split(s.venue, s.host)}`,
            }))}
          />
          <BarChartCard
            title={t('crm.dashboard.leadsByPriority')}
            caption={t('crmApp.dashboard.priorityCaption')}
            empty={t('crmApp.dashboard.empty')}
            testID="chart-priority"
            rows={d.priorities.map((p) => ({
              key: p.label,
              label: p.label,
              segments: [{ key: 'count', value: p.count, color: theme.warning?.val ?? '' }],
              description: `${p.label}: ${p.count}`,
            }))}
          />
          <BarChartCard
            title={t('crm.dashboard.leadsBySuperCategory')}
            caption={t('crmApp.dashboard.categoryCaption')}
            legend={legend}
            empty={t('crmApp.dashboard.empty')}
            testID="chart-category"
            rows={d.superCategories.map((c) => ({
              key: c.super_category_id,
              label: c.label,
              segments: [
                { key: 'venue', value: c.venue, color: venueColor },
                { key: 'host', value: c.host, color: hostColor },
              ],
              description: `${c.label}: ${split(c.venue, c.host)}`,
            }))}
          />
          <BarChartCard
            title={t('crm.dashboard.servicesMix')}
            caption={t('crmApp.dashboard.servicesCaption')}
            empty={t('crmApp.dashboard.empty')}
            testID="chart-services"
            rows={d.services.services.map((s) => ({
              key: s.label,
              label: s.label,
              segments: [{ key: 'count', value: s.count, color: theme.success?.val ?? '' }],
              description: `${s.label}: ${s.count}`,
            }))}
          />
        </>
      )}
    </ScrollView>
  );
}
