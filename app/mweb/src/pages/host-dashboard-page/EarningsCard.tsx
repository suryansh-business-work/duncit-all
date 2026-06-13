import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PaymentsIcon from '@mui/icons-material/Payments';
import { useDateFormat } from '../../utils/dateFormat';

interface Props {
  balance: number;
  currency: string;
  nextPayoutAt?: string | null;
}

/** Host earnings summary — available wallet balance + next payout, with wallet
 * and withdraw shortcuts (B2-#5). */
export default function EarningsCard({ balance, currency, nextPayoutAt }: Readonly<Props>) {
  const { formatDate } = useDateFormat();

  return (
    <Card
      sx={{
        borderRadius: 4,
        color: 'common.white',
        background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 60%, #16121f 100%)',
        boxShadow: '0 18px 42px rgba(245,51,122,0.24)',
      }}
    >
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1}>
          <PaymentsIcon fontSize="small" />
          <Typography variant="caption" sx={{ fontWeight: 900, letterSpacing: 1 }}>
            AVAILABLE BALANCE
          </Typography>
        </Stack>
        <Typography variant="h3" sx={{ fontWeight: 950, mt: 0.5 }}>
          {currency}
          {balance.toFixed(2)}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 700 }}>
          {nextPayoutAt ? `Next payout ${formatDate(nextPayoutAt)}` : 'Earnings from your hosted pods'}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
          <Button
            component={RouterLink}
            to="/host/wallet"
            variant="contained"
            size="small"
            startIcon={<AccountBalanceWalletIcon />}
            sx={{ borderRadius: 999, fontWeight: 900, bgcolor: 'common.white', color: 'text.primary', '&:hover': { bgcolor: 'grey.100' } }}
          >
            Wallet
          </Button>
          <Box sx={{ flex: 1 }} />
        </Stack>
      </CardContent>
    </Card>
  );
}
