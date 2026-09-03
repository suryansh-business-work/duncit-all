import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, MenuItem, Stack, TextField } from '@mui/material';
import SpaceDashboardIcon from '@mui/icons-material/SpaceDashboard';
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
import DashboardCategoryTiles from './DashboardCategoryTiles';
import DashboardClubBreakdown from './DashboardClubBreakdown';
import DashboardKpiGroups from './DashboardKpiGroups';
import DashboardTrendCard from './DashboardTrendCard';
import { MWEB_CLUB_ADMIN_DASHBOARD } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * Club Admin Dashboard — pods, bookings, community and revenue across every
 * club the signed-in admin runs, in the range the select puts it in. The
 * figures, the trend series and the ranges are `@duncit/utils`' (rule 40);
 * the Partners console reads the same query. Native twin: ClubAdminDashboard.
 */
export default function ClubAdminDashboardPage() {
  const { t } = useTranslation();
  const [range, setRange] = useState<ClubAdminRange>(DEFAULT_CLUB_ADMIN_RANGE);
  const rangeLabels = useMemo(() => clubAdminRangeLabels(t), [t]);
  const from = useMemo(() => clubAdminRangeFrom(range), [range]);
  const { data, loading, error } = useQuery<any>(MWEB_CLUB_ADMIN_DASHBOARD, {
    variables: { from, to: null },
    fetchPolicy: 'cache-and-network',
  });
  const dashboard: ClubAdminDashboard = data?.clubAdminDashboard ?? emptyClubAdminDashboard;
  const pending = loading && !data;

  return (
    <Stack spacing={2.25} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <StudioPageHeader
        icon={<SpaceDashboardIcon fontSize="small" />}
        title={t('clubAdmin.dashboard.title')}
        caption={t('clubAdmin.dashboard.subtitle')}
      />

      <TextField
        select
        size="small"
        fullWidth
        label={t('clubAdmin.dashboard.range')}
        value={range}
        onChange={(event) => setRange(event.target.value as ClubAdminRange)}
      >
        {clubAdminRanges.map((item) => (
          <MenuItem key={item.value} value={item.value}>
            {rangeLabels[item.value]}
          </MenuItem>
        ))}
      </TextField>

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
