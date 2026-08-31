import { useCallback, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { DuncitDashboard } from '@duncit/dashboard';
import { buildWidgets, unpricedNotice } from './widgets';
import RateCardDialog from './RateCardDialog';
import { OPENAI_USAGE_DASHBOARD, RANGE_OPTIONS, type ModelPrice, type UsageDashboardData } from './queries';

/**
 * OpenAI Dashboard — what the product spent, and on what.
 *
 * Every OpenAI call in the platform funnels through one server-side client that
 * records its tokens and prices them, so this is the whole bill: moderation
 * scans, support replies, CRM parsing, admin tools, release notes. The provider
 * console can only total by API key; the question worth asking is which feature
 * is spending, and that only exists here.
 */
export default function OpenAiDashboardPage() {
  const { t } = useTranslation();
  const [rangeDays, setRangeDays] = useState(7);
  // `undefined` = closed, `null` = adding a model, a row = editing that rate.
  const [editing, setEditing] = useState<ModelPrice | null | undefined>(undefined);
  const { data, loading, error, refetch } = useQuery<{ openAiUsageDashboard: UsageDashboardData }>(
    OPENAI_USAGE_DASHBOARD,
    { variables: { range_days: rangeDays }, fetchPolicy: 'cache-and-network' }
  );

  const openRate = useCallback((price: ModelPrice | null) => setEditing(price), []);
  const closeRate = useCallback(() => setEditing(undefined), []);
  // A saved rate changes what future calls cost AND the rate list on screen.
  const afterSave = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);

  const d = data?.openAiUsageDashboard;

  const header = (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1}
      sx={{
        justifyContent: "space-between",
        alignItems: { xs: 'flex-start', sm: 'center' }
      }}>
      <Box>
        <Typography variant="h5">{t('ai.dashboard.title')}</Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          {t('ai.dashboard.subtitle')}
        </Typography>
      </Box>
      <TextField
        select
        size="small"
        label={t('ai.dashboard.range')}
        value={rangeDays}
        onChange={(e) => setRangeDays(Number(e.target.value))}
        sx={{ minWidth: 160 }}
      >
        {RANGE_OPTIONS.map((r) => (
          <MenuItem key={r.value} value={r.value}>
            {r.label}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );

  if (!d) {
    return (
      <Stack spacing={3}>
        {header}
        <QueryGuard loading={loading && !data} error={error} errorText={error?.message} spinnerSx={{ py: 6 }}>
          {() => null}
        </QueryGuard>
      </Stack>
    );
  }

  return (
    <>
      <DuncitDashboard
        dashboardId="ai.openai"
        header={
          <Stack spacing={2}>
            {header}
            {unpricedNotice(d.unpriced_models, t)}
          </Stack>
        }
        widgets={buildWidgets(d, openRate, t)}
      />
      <RateCardDialog price={editing} onClose={closeRate} onSaved={afterSave} />
    </>
  );
}
