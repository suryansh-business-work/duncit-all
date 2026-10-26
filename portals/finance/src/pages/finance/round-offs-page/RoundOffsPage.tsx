import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Box, Stack, Typography } from '@mui/material';
import PercentIcon from '@mui/icons-material/Percent';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { fmt } from '../payment-logs-page/helpers';
import TotalsStrip, { type StripTotal } from '../payment-logs-page/TotalsStrip';
import {
  EMPTY_ROUND_OFF_SUMMARY,
  ROUND_OFFS_TABLE,
  type RoundOffRow,
  type RoundOffsData,
  type RoundOffSummary,
} from './queries';
import RoundOffsTable from './RoundOffsTable';

const POLL_MS = 30000;

/**
 * Finance › Round Offs: every payment whose bill was rounded up to a whole
 * rupee, wherever it was taken — a pod booking, the Pod Shop cart, the pet
 * store or a gift card.
 *
 * Read-only. The round-off is fixed when the payment is priced; this page only
 * accounts for it. The totals above the table arrive with the table page and
 * are the server's aggregate over the whole filter, so they always describe
 * exactly the rows the filter matches — not just the page on screen.
 */
export default function RoundOffsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const navigate = useNavigate();
  const refetchRef = useRef<(() => void) | null>(null);
  const [summary, setSummary] = useState<RoundOffSummary>(EMPTY_ROUND_OFF_SUMMARY);

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query<RoundOffsData>({
        query: ROUND_OFFS_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      const page = data?.paymentRoundOffsTable;
      if (!page) return { rows: [], total: 0 };
      setSummary(page.summary);
      return { rows: page.rows, total: page.total };
    },
    [client],
  );

  // Payments land all day — the same live refresh Payment Logs runs.
  useEffect(() => {
    const timer = globalThis.setInterval(() => refetchRef.current?.(), POLL_MS);
    return () => globalThis.clearInterval(timer);
  }, []);

  // A round-off has no page of its own: what it belongs to is the payment.
  const handleOpen = useCallback((r: RoundOffRow) => navigate(`/payment-logs/${r.id}`), [navigate]);

  const totals = useMemo<StripTotal[]>(
    () => [
      { key: 'count', label: t('finance.roundOffs.totalCount'), value: summary.count },
      {
        key: 'round-off',
        label: t('finance.roundOffs.totalRoundOff'),
        value: fmt(summary.round_off_total),
        hint: t('finance.roundOffs.totalRoundOffHint'),
      },
      {
        key: 'collected',
        label: t('finance.roundOffs.totalCollected'),
        value: fmt(summary.collected_round_off_total),
        hint: t('finance.roundOffs.totalCollectedHint'),
      },
    ],
    [summary, t],
  );

  return (
    <Box>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
        <PercentIcon color="primary" />
        <Typography component="h1" variant="h5" sx={{ fontWeight: 700, flex: 1 }}>
          {t('finance.roundOffs.title')}
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        {t('finance.roundOffs.subtitle')}
      </Typography>

      <TotalsStrip totals={totals} testId="finance-round-offs-totals" />

      <RoundOffsTable fetchRows={fetchRows} refetchRef={refetchRef} onOpen={handleOpen} />
    </Box>
  );
}
