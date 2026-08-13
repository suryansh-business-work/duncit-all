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

/**
 * What WhatsApp cost and reached. Every figure comes from the rate each send
 * froze, so this page and the Logs can never disagree — and a rate change today
 * does not rewrite last month.
 */

/** Windows worth asking for. Days rather than calendar months: a send is billed
 * when it goes out, not when the month turns. */
const WINDOWS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

const DAY_MS = 24 * 60 * 60 * 1000;

const fromFor = (days: string) => {
  if (days === 'all') return null;
  return new Date(Date.now() - Number(days) * DAY_MS).toISOString();
};

export default function WaDashboard() {
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
          label="Window"
          value={range}
          onChange={(event) => setRange(event.target.value)}
          sx={{ minWidth: 180 }}
        >
          {WINDOWS.map((option) => (
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
              label="Spent"
              value={waMoney(board.total_cost, currency)}
              hint="Messages that actually went out"
              icon={<CurrencyRupeeIcon />}
            />
            <KpiCard
              label="Messages sent"
              value={board.messages_sent.toLocaleString()}
              hint={`Across ${board.campaigns.toLocaleString()} sends`}
              icon={<ForwardToInboxIcon />}
            />
            <KpiCard
              label="Failed"
              value={board.messages_failed.toLocaleString()}
              hint="AiSensy refused the message"
              icon={<ReportGmailerrorredIcon />}
            />
            <KpiCard
              label="Skipped"
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
