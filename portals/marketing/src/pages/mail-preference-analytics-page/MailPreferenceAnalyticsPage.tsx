import { useMemo, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { Box, Grid, MenuItem, Stack, TextField, Typography } from '@mui/material';
import UnsubscribeIcon from '@mui/icons-material/Unsubscribe';
import DoNotDisturbOnIcon from '@mui/icons-material/DoNotDisturbOn';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import UndoIcon from '@mui/icons-material/Undo';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import KpiCard from '../dashboard-page/KpiCard';
import CategoryBreakdown from './CategoryBreakdown';
import SourceBreakdown from './SourceBreakdown';
import { getMailPreferenceLogColumns } from './columns';
import {
  MAIL_PREFERENCE_ANALYTICS,
  MAIL_PREFERENCE_LOGS_TABLE,
  type MailPreferenceAnalytics,
  type MailPreferenceLogRow,
} from './queries';

/** The windows an opt-out report is actually read over. */
const RANGES = [7, 30, 90, 365];

const getRowId = (row: MailPreferenceLogRow) => row.id;

/**
 * Mail Preference Analytics — who has asked us to stop writing, about what, and
 * from where.
 *
 * The numbers come from two places on purpose. The tiles about "right now" read
 * the preference documents; everything windowed reads the change log, because a
 * current-state-only report cannot see somebody who opted out after a campaign
 * and came back a week later — which is the single most useful thing a campaign
 * can learn about itself.
 */
export default function MailPreferenceAnalyticsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [rangeDays, setRangeDays] = useState(30);

  const { data } = useQuery<{ mailPreferenceAnalytics: MailPreferenceAnalytics }>(
    MAIL_PREFERENCE_ANALYTICS,
    { variables: { range_days: rangeDays }, fetchPolicy: 'cache-and-network' },
  );
  const summary = data?.mailPreferenceAnalytics ?? null;
  const categories = useMemo(
    () => (summary?.by_category ?? []).map((row) => row.category),
    [summary],
  );

  const fetchRows = useApolloTableFetch<MailPreferenceLogRow>(
    client,
    MAIL_PREFERENCE_LOGS_TABLE,
    'mailPreferenceLogsTable',
  );
  const columns = useMemo(
    () => getMailPreferenceLogColumns(t, categories),
    [t, categories],
  );

  const count = (value: number | undefined) => (value ?? 0).toLocaleString();

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="flex-start" spacing={2} mb={2}>
        <Stack spacing={0.25} sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            {t('mailPreference.analytics.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('mailPreference.analytics.subtitle')}
          </Typography>
        </Stack>
        <TextField
          select
          size="small"
          label={t('mailPreference.analytics.range')}
          value={rangeDays}
          onChange={(event) => setRangeDays(Number(event.target.value))}
          sx={{ minWidth: 170 }}
        >
          {RANGES.map((days) => (
            <MenuItem key={days} value={days}>
              {t('mailPreference.analytics.rangeDays', { vars: { days } })}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label={t('mailPreference.analytics.peopleOptedOut')}
            value={count(summary?.people_opted_out)}
            hint={t('mailPreference.analytics.peopleOptedOutHint')}
            icon={<UnsubscribeIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label={t('mailPreference.analytics.peopleOptedOutAll')}
            value={count(summary?.people_opted_out_all)}
            hint={t('mailPreference.analytics.peopleOptedOutAllHint')}
            icon={<DoNotDisturbOnIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label={t('mailPreference.analytics.optOuts')}
            value={count(summary?.opt_outs)}
            hint={t('mailPreference.analytics.optOutsHint')}
            icon={<TrendingDownIcon />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label={t('mailPreference.analytics.optIns')}
            value={count(summary?.opt_ins)}
            hint={t('mailPreference.analytics.optInsHint')}
            icon={<UndoIcon />}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={7}>
          <CategoryBreakdown rows={summary?.by_category ?? []} />
        </Grid>
        <Grid item xs={12} md={5}>
          <SourceBreakdown rows={summary?.by_source ?? []} />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
        {t('mailPreference.analytics.logTitle')}
      </Typography>
      <DuncitTable<MailPreferenceLogRow>
        tableId="marketing-mail-preference-logs"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        emptyText={t('mailPreference.analytics.logEmpty')}
        searchPlaceholder={t('mailPreference.analytics.logSearch')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
      />
    </Box>
  );
}
