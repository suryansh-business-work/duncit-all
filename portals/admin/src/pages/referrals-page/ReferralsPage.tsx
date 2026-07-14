import { useCallback, useEffect, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import ReferralsTable from './ReferralsTable';
import { REFERRALS_TABLE, REFERRAL_SETTINGS, UPDATE_GIFT, type ReferralRow } from './queries';

/** Referrals — who referred whom, plus the gift users earn (B4-11). */
export default function ReferralsPage() {
  const client = useApolloClient();
  const { data, refetch } = useQuery(REFERRAL_SETTINGS, { fetchPolicy: 'cache-and-network' });
  const [updateGift, giftState] = useMutation(UPDATE_GIFT);
  const [gift, setGift] = useState('');
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    if (data?.referralSettings) setGift(data.referralSettings.gift_description ?? '');
  }, [data?.referralSettings]);

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const res = await client.query({
        query: REFERRALS_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      const page = res.data.referralsTable;
      setTotal(page.total as number);
      return { rows: page.rows as ReferralRow[], total: page.total as number };
    },
    [client],
  );

  const saveGift = async () => {
    await updateGift({ variables: { gift_description: gift } });
    await refetch();
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <CardGiftcardIcon color="primary" />
        <Typography variant="h5" sx={{ fontWeight: 900 }}>
          Referrals
        </Typography>
        {total != null && <Chip size="small" label={total} sx={{ ml: 1 }} />}
      </Stack>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1 }}>
            Referral gift
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Shown to every user on their Refer &amp; Earn page.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="e.g. ₹100 off your next pod for every friend who joins"
              value={gift}
              onChange={(e) => setGift(e.target.value)}
            />
            <Button
              variant="contained"
              onClick={() => {
                saveGift().catch(() => undefined);
              }}
              disabled={giftState.loading}
              sx={{ fontWeight: 900, px: 3 }}
            >
              {giftState.loading ? 'Saving…' : 'Save'}
            </Button>
          </Stack>
          {giftState.error && <Alert severity="error" sx={{ mt: 1 }}>{giftState.error.message}</Alert>}
        </CardContent>
      </Card>

      <ReferralsTable fetchRows={fetchRows} />
    </Stack>
  );
}
