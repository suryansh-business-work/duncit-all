import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Alert, Box, MenuItem, Skeleton, Stack, TextField } from '@mui/material';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import ForwardToInboxIcon from '@mui/icons-material/ForwardToInbox';
import ReportGmailerrorredIcon from '@mui/icons-material/ReportGmailerrorred';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { parseApiError } from '@duncit/utils';
import KpiCard from '../../dashboard-page/KpiCard';
import { waMoney } from '../helpers';
import { WA_DASHBOARD, type WaDashboardData } from '../queries';
import SpendByCategory from './SpendByCategory';
import TopCampaignsCard from './TopCampaignsCard';
import { useTranslation } from '@duncit/app-settings';

/**
 * What WhatsApp cost and reached. Every figure comes from the rate each send
 * froze, so this page and the Logs can never disagree — and a rate change today
 * does not rewrite last month.
 */

/** Windows worth asking for. Days rather than calendar months: a send is billed
 * when it goes out, not when the month turns. */
type Translate = ReturnType<typeof useTranslation>['t'];

const windows = (t: Translate) => [
  { value: '7', label: t('marketing.whatsappCampaigns.last7Days') },
  { value: '30', label: t('marketing.whatsappCampaigns.last30Days') },
  { value: '90', label: t('marketing.whatsappCampaigns.last90Days') },
  { value: 'all', label: t('marketing.whatsappCampaigns.allTime') },
];

const DAY_MS = 24 * 60 * 60 * 1000;

const fromFor = (days: string) => {
  if (days === 'all') return null;
  return new Date(Date.now() - Number(days) * DAY_MS).toISOString();
};

export default function WaDashboard() {
  const { t } = useTranslation();
  const [range, setRange] = useState('30');
  const from = useMemo(() => fromFor(range), [range]);
  const { data, loading, error } = useQuery<{ waCampaignDashboard: WaDashboardData }>(WA_DASHBOARD, {
    variables: { from, to: null },
    fetchPolicy: 'cache-and-network',
  });

  const board = data?.waCampaignDashboard;
  const currency = board?.currency_symbol ?? '₹';

  if (error) {
    return <Alert severity="error">{parseApiError(error, 'Could not read the dashboard')}</Alert>;
  }

  return (
    <Stack spacing={2}>
      <Box>
        <TextField
          select
          size="small"
          label={t('marketing.whatsappCampaigns.window')}
          value={range}
          onChange={(event) => setRange(event.target.value)}
          sx={{ minWidth: 180 }}
        >
          {windows(t).map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {!board && loading && <Skeleton variant="rounded" height={120} />}

      {board && (
        <>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
            }}
          >
            <KpiCard
              label={t('marketing.whatsappCampaigns.spent')}
              value={waMoney(board.total_cost, currency)}
              hint="Messages that actually went out"
              icon={<CurrencyRupeeIcon />}
            />
            <KpiCard
              label={t('marketing.whatsappCampaigns.messagesSent')}
              value={board.messages_sent.toLocaleString()}
              hint={`Across ${board.campaigns.toLocaleString()} sends`}
              icon={<ForwardToInboxIcon />}
            />
            <KpiCard
              label={t('marketing.common.failed')}
              value={board.messages_failed.toLocaleString()}
              hint="AiSensy refused the message"
              icon={<ReportGmailerrorredIcon />}
            />
            <KpiCard
              label={t('marketing.whatsappCampaigns.skipped')}
              value={board.messages_skipped.toLocaleString()}
              hint="Nothing attempted, nothing billed"
              icon={<WhatsAppIcon />}
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            }}
          >
            <SpendByCategory rows={board.by_category} currency={currency} />
            <TopCampaignsCard rows={board.top_campaigns} currency={currency} />
          </Box>
        </>
      )}
    </Stack>
  );
}
