import { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Spinner, YStack } from 'tamagui';
import {
  DEFAULT_CLUB_ADMIN_RANGE,
  clubAdminRangeLabels,
  clubAdminRanges,
  type ClubAdminRange,
} from '@duncit/utils';

import { StackScreen } from '@/components/StackScreen';
import { LoadErrorNotice } from '@/components/club-admin/LoadErrorNotice';
import { PageHeading } from '@/components/club-admin/PageHeading';
import { CategoryTiles } from '@/components/club-admin/dashboard/CategoryTiles';
import { ClubBreakdown } from '@/components/club-admin/dashboard/ClubBreakdown';
import { KpiGroupsSection } from '@/components/club-admin/dashboard/KpiGroupsSection';
import { TrendCard } from '@/components/club-admin/dashboard/TrendCard';
import { ChipSelectField } from '@/components/create-pod';
import { useClubAdminDashboard } from '@/hooks/useClubAdminDashboard';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

/**
 * Club Admin Dashboard — the twin of mWeb's /clubs/dashboard (rule 27): the
 * range chips, the four KPI groups, the monthly trend, the per-club breakdown
 * and the category tiles, all from `clubAdminDashboard(from, to)`. Which
 * figures become tiles and how each is written is @duncit/utils' call.
 */
export function ClubAdminDashboardScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [range, setRange] = useState<ClubAdminRange>(DEFAULT_CLUB_ADMIN_RANGE);
  const { data, isLoading, hasError, refetch } = useClubAdminDashboard(range);
  const rangeOptions = useMemo(() => {
    const labels = clubAdminRangeLabels(t);
    return clubAdminRanges.map((option) => ({ value: option.value, label: labels[option.value] }));
  }, [t]);

  return (
    <StackScreen header title={t('mweb.meta.clubDashboard.title')} testID="club-dashboard-screen">
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={14} padding={16} paddingBottom={48}>
          <PageHeading
            eyebrow={t('clubAdmin.dashboard.eyebrow')}
            title={t('clubAdmin.dashboard.title')}
            subtitle={t('clubAdmin.dashboard.subtitle')}
          />
          <ChipSelectField
            label={t('clubAdmin.dashboard.range')}
            options={rangeOptions}
            value={range}
            onChange={(next) => setRange(next as ClubAdminRange)}
            testID="club-dashboard-range"
          />
          {isLoading ? <Spinner testID="club-dashboard-loading" color="$primary" /> : null}
          {hasError ? <LoadErrorNotice testID="club-dashboard-error" onRetry={refetch} /> : null}
          <KpiGroupsSection kpis={data.kpis} />
          <TrendCard trend={data.trend} />
          <ClubBreakdown
            clubs={data.clubs}
            currency={data.kpis.currency_symbol}
            onOpen={(clubId) => navigation.navigate('ClubPods', { clubId })}
          />
          <CategoryTiles categories={data.categories} />
        </YStack>
      </ScrollView>
    </StackScreen>
  );
}
