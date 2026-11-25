import { useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { CRM_DASHBOARD_RANGES, type CrmDashboardRange } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { StateView } from '@/components/StateView';
import { useDashboard } from '@/features/dashboard/useDashboard';
import { useTranslation } from '@/hooks/useTranslation';
import { BarChartCard } from '@/components/BarChartCard';
import { KpiGrid } from '@/components/KpiGrid';

/** The phone offers the preset ranges; a custom from–to range stays on the portal for now. */
const RANGES = CRM_DASHBOARD_RANGES.filter((r) => r !== 'custom');

/**
 * The CRM portal's Dashboard: venue and host leads for a date range — the KPI
 * tiles, leads by stage, by priority, by super category and the services mix,
 * counted by the same shared functions as the portal.
 */
export function DashboardScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [range, setRange] = useState<CrmDashboardRange>('month');
  const d = useDashboard(range, {
    uncategorised: t('crmApp.dashboard.uncategorised'),
    loadFailed: t('crmApp.common.loadFailed'),
  });
  const venueColor = theme.primary?.val ?? '';
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
      <XStack alignItems="center" gap="$2">
        <MaterialIcons
          name="dashboard"
          size={24}
          color={theme.accentText?.val}
          accessibilityElementsHidden
        />
        <YStack flex={1}>
          <Text fontSize="$7" fontWeight="800" role="heading">
            {t('crmApp.dashboard.title')}
          </Text>
          <Text color="$muted" fontSize="$2">
            {t('crmApp.dashboard.subtitle')}
          </Text>
        </YStack>
      </XStack>
      <XStack
        flexWrap="wrap"
        gap="$2"
        role="radiogroup"
        aria-label={t('crm.dashboard.dashboardTimeRange')}
      >
        {RANGES.map((r) => (
          <DuncitButton
            key={r}
            label={t(`crmApp.dashboard.range.${r}`)}
            onPress={() => setRange(r)}
            size="sm"
            variant={range === r ? 'solid' : 'outline'}
            testID={`dashboard-range-${r}`}
          />
        ))}
      </XStack>
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
