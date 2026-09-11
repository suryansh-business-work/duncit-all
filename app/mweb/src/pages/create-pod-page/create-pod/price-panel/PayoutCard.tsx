import { Box, Chip, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import { useTranslation } from '../../../../i18n/useTranslation';

interface Props {
  amount: string;
  payingPax: number;
  earnPct: number;
  /** The Net Payout audit line: collection − deductions = the amount shown. */
  collection: string;
  totalDeductions: string;
}

/** The final payout — the strongest element on the card: big green take-home,
 * the paying-pax count, the share-of-collection chip and the Net Payout
 * arithmetic (collection − deductions), with the estimates note inside. */
export default function PayoutCard({ amount, payingPax, earnPct, collection, totalDeductions }: Readonly<Props>) {
  const theme = useTheme();
  const { t } = useTranslation();
  const receiveLabel = t('mweb.createPod.youWillReceive');
  return (
    <Box
      data-testid="price-panel-payout"
      sx={{
        borderRadius: '16px',
        p: 1.75,
        bgcolor: alpha(theme.palette.success.main, 0.12),
      }}
    >
      <Stack direction="row" spacing={1.25} sx={{
        alignItems: "flex-start"
      }}>
        <AccountBalanceWalletOutlinedIcon color="success" sx={{ mt: 0.25 }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontSize: '1rem', fontWeight: 600 }}>
            {receiveLabel}
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: "center",
              flexWrap: "wrap"
            }}>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontWeight: 600
              }}>
              {t('mweb.createPod.payingPax', { vars: { count: payingPax } })}
            </Typography>
            <Chip
              size="small"
              label={t('mweb.createPod.shareOfCollection', { vars: { pct: earnPct } })}
              sx={{ height: 24, fontSize: '0.75rem', bgcolor: 'background.paper', color: 'success.main' }}
            />
          </Stack>
        </Box>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: "success.main",
            whiteSpace: 'nowrap'
          }}>
          {amount}
        </Typography>
      </Stack>
      <Stack spacing={0.25} sx={{ mt: 1.25, px: 0.5 }} data-testid="price-panel-net-payout">
        <Stack direction="row" sx={{
          justifyContent: "space-between"
        }}>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {t('mweb.createPod.totalCollectionLabel')}
          </Typography>
          <Typography variant="caption" sx={{
            fontWeight: 700
          }}>
            {collection}
          </Typography>
        </Stack>
        <Stack direction="row" sx={{
          justifyContent: "space-between"
        }}>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {t('mweb.createPod.minusTotalDeductions')}
          </Typography>
          <Typography variant="caption" sx={{
            fontWeight: 700
          }}>
            {totalDeductions}
          </Typography>
        </Stack>
        <Stack direction="row" sx={{
          justifyContent: "space-between"
        }}>
          <Typography variant="caption" sx={{
            fontWeight: 600
          }}>
            {t('mweb.createPod.equalsYouWillReceive')}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: "success.main"
            }}>
            {amount}
          </Typography>
        </Stack>
      </Stack>
      <Typography variant="caption" component="div" sx={{ mt: 1.25, px: 0.5, color: 'text.secondary' }}>
        {t('mweb.createPod.estimatesNote')}
      </Typography>
    </Box>
  );
}
