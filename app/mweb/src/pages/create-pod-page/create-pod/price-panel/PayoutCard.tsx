import { Box, Chip, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';

interface Props {
  amount: string;
  payingPax: number;
  earnPct: number;
}

/** The final payout — the strongest element on the card: big green take-home,
 * the paying-pax count and the share-of-collection chip, with the estimates
 * note inside so the payout and its caveat read as one unit. */
export default function PayoutCard({ amount, payingPax, earnPct }: Readonly<Props>) {
  const theme = useTheme();
  return (
    <Box
      data-testid="price-panel-payout"
      sx={{
        borderRadius: 2.5,
        p: 1.5,
        bgcolor: alpha(theme.palette.success.main, 0.08),
        border: '1px solid',
        borderColor: alpha(theme.palette.success.main, 0.3),
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <AccountBalanceWalletOutlinedIcon color="success" sx={{ mt: 0.25 }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={900}>
            You will receive
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              For {payingPax} paying pax
            </Typography>
            <Chip
              size="small"
              color="success"
              variant="outlined"
              label={`${earnPct}% of collection`}
              sx={{ fontWeight: 800 }}
            />
          </Stack>
        </Box>
        <Typography variant="h5" fontWeight={900} color="success.main" sx={{ whiteSpace: 'nowrap' }}>
          {amount}
        </Typography>
      </Stack>
      <Box
        sx={{
          mt: 1.25,
          px: 1.25,
          py: 0.75,
          borderRadius: 2,
          border: '1px dashed',
          borderColor: alpha(theme.palette.success.main, 0.4),
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Estimates at today&apos;s rates — final settlement happens after the pod completes.
        </Typography>
      </Box>
    </Box>
  );
}
