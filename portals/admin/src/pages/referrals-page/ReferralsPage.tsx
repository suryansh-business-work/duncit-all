import { useEffect, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';

const REFERRALS = gql`
  query AdminReferrals {
    referrals {
      id
      code
      referrer_user_id
      referrer_name
      referred_user_id
      referred_name
      created_at
    }
    referralSettings {
      gift_description
    }
  }
`;

const UPDATE_GIFT = gql`
  mutation UpdateReferralGift($gift_description: String!) {
    updateReferralGift(gift_description: $gift_description) {
      gift_description
    }
  }
`;

/** Referrals — who referred whom, plus the gift users earn (B4-11). */
export default function ReferralsPage() {
  const { data, loading, error, refetch } = useQuery(REFERRALS, { fetchPolicy: 'cache-and-network' });
  const [updateGift, giftState] = useMutation(UPDATE_GIFT);
  const [gift, setGift] = useState('');
  const rows: any[] = data?.referrals ?? [];

  useEffect(() => {
    if (data?.referralSettings) setGift(data.referralSettings.gift_description ?? '');
  }, [data?.referralSettings]);

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
        <Chip size="small" label={rows.length} sx={{ ml: 1 }} />
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
            <Button variant="contained" onClick={() => void saveGift().catch(() => undefined)} disabled={giftState.loading} sx={{ fontWeight: 900, px: 3 }}>
              {giftState.loading ? 'Saving…' : 'Save'}
            </Button>
          </Stack>
          {giftState.error && <Alert severity="error" sx={{ mt: 1 }}>{giftState.error.message}</Alert>}
        </CardContent>
      </Card>

      {loading && !data && (
        <Stack alignItems="center" sx={{ py: 4 }}>
          <CircularProgress size={22} />
        </Stack>
      )}
      {error && <Alert severity="error">{error.message}</Alert>}

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 900 }}>Referrer</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>Referred</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>Code</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>When</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No referrals yet.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.referrer_name || row.referrer_user_id}</TableCell>
                  <TableCell>{row.referred_name || row.referred_user_id}</TableCell>
                  <TableCell>
                    <Chip size="small" label={row.code} sx={{ fontWeight: 800 }} />
                  </TableCell>
                  <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </Stack>
  );
}
