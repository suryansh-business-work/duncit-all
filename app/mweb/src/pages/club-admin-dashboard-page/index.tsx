import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import SpaceDashboardRoundedIcon from '@mui/icons-material/SpaceDashboardRounded';
import {
  DEFAULT_CLUB_ADMIN_RANGE,
  clubAdminRangeFrom,
  clubAdminRangeLabels,
  clubAdminRanges,
  emptyClubAdminDashboard,
  type ClubAdminDashboard,
  type ClubAdminRange,
} from '@duncit/utils';
import StudioPageHeader from '../../components/StudioPageHeader';
import PillChips from '../../components/club-admin/PillChips';
import DashboardCategoryTiles from './DashboardCategoryTiles';
import DashboardClubBreakdown from './DashboardClubBreakdown';
import DashboardKpiGroups from './DashboardKpiGroups';
import DashboardTrendCard from './DashboardTrendCard';
import { MWEB_CLUB_ADMIN_DASHBOARD } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * Club Admin Dashboard — pods, bookings, community and revenue across every
 * club the signed-in admin runs, in the range the pill row puts it in. The
 * figures, the trend series and the ranges are `@duncit/utils`' (rule 40);
 * the Partners console reads the same query. Native twin: ClubAdminDashboard.
 */
export default function ClubAdminDashboardPage() {
  const { t } = useTranslation();
  const [range, setRange] = useState<ClubAdminRange>(DEFAULT_CLUB_ADMIN_RANGE);
  const rangeOptions = useMemo(() => {
    const labels = clubAdminRangeLabels(t);
    return clubAdminRanges.map((item) => ({ value: item.value, label: labels[item.value] }));
  }, [t]);
  const from = useMemo(() => clubAdminRangeFrom(range), [range]);
  const { data, loading, error } = useQuery<any>(MWEB_CLUB_ADMIN_DASHBOARD, {
    variables: { from, to: null },
    fetchPolicy: 'cache-and-network',
  });
  const dashboard: ClubAdminDashboard = data?.clubAdminDashboard ?? emptyClubAdminDashboard;
  const pending = loading && !data;

  return (
    <Stack spacing={3} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <StudioPageHeader
        icon={<SpaceDashboardRoundedIcon fontSize="small" />}
        title={t('clubAdmin.dashboard.title')}
      />

      <PillChips
        label={t('clubAdmin.dashboard.range')}
        options={rangeOptions}
        value={range}
        onChange={setRange}
      />

      {error && <Alert severity="error">{error.message}</Alert>}

      <DashboardKpiGroups kpis={dashboard.kpis} loading={pending} />
      <DashboardTrendCard trend={dashboard.trend} />
      <DashboardClubBreakdown
        clubs={dashboard.clubs}
        currencySymbol={dashboard.kpis.currency_symbol}
        loading={pending}
      />
      <DashboardCategoryTiles categories={dashboard.categories} loading={pending} />
    </Stack>
  );
}
