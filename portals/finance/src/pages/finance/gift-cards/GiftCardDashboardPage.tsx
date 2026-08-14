import { useQuery } from '@apollo/client';
import { Alert, Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import { useSearchParams } from 'react-router-dom';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import { useTranslation } from '@duncit/app-settings';
import GiftCardMonthlyChart from './GiftCardMonthlyChart';
import GiftCardSettingsCard from './GiftCardSettingsCard';
import GiftCardStatTiles from './GiftCardStatTiles';
import { GIFT_CARD_ADMIN_STATS, type GiftCardAdminStats } from './queries';

/** Window options for the sold-vs-redeemed chart. The server clamps to 1..36. */
const MONTH_RANGES = [6, 12, 24, 36];

export default function GiftCardDashboardPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const months = Number(params.get('months')) || 12;

  const { data, loading, error } = useQuery(GIFT_CARD_ADMIN_STATS, {
    variables: { months },
    fetchPolicy: 'cache-and-network',
  });
  const stats = data?.giftCardAdminStats as GiftCardAdminStats | undefined;

  const widgets: DashboardWidget[] = [
    {
      id: 'gift-card-tiles',
      bare: true,
      // Five tiles wrap on smaller screens — h2 would show one cut row.
      fitContent: true,
      defaultLayout: { x: 0, y: 0, w: 12, h: 2 },
      minH: 2,
      content: <GiftCardStatTiles stats={stats} loading={loading} />,
    },
    {
      id: 'gift-card-monthly',
      bare: true,
      defaultLayout: { x: 0, y: 2, w: 12, h: 6 },
      minW: 4,
      minH: 4,
      content: <GiftCardMonthlyChart buckets={stats?.monthly ?? []} loading={loading} />,
    },
    {
      id: 'gift-card-settings',
      bare: true,
      fitContent: true,
      defaultLayout: { x: 0, y: 8, w: 6, h: 5 },
      minW: 4,
      minH: 3,
      content: <GiftCardSettingsCard />,
    },
  ];

  return (
    <DuncitDashboard
      dashboardId="finance.giftcards"
      header={
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
          >
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <CardGiftcardIcon color="primary" />
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  {t('finance.giftCards.dashboardTitle')}
                </Typography>
              </Stack>
            </Box>
            <TextField
              select
              size="small"
              label={t('finance.giftCards.periodLabel')}
              value={months}
              onChange={(e) => setParams({ months: e.target.value })}
              sx={{ minWidth: 180 }}
            >
              {MONTH_RANGES.map((option) => (
                <MenuItem key={option} value={option}>
                  {t('finance.giftCards.months', { vars: { n: option } })}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          {error && <Alert severity="error">{error.message}</Alert>}
        </Stack>
      }
      widgets={widgets}
    />
  );
}
