import { Box, Typography } from '@mui/material';
import { payableSpots } from '@duncit/utils';
import { useTranslation } from '../i18n/useTranslation';

interface Props {
  amount: number;
  finance: { platform_fee_pct: number; gst_pct: number; currency_symbol?: string };
  productCost?: number;
  /** TOTAL spots (capacity). The host's seat is free, so the product cost is
   * recovered from the payable spots only — see payableSpots. */
  spots?: number;
}

/** Live breakdown of platform fee + GST + per-person payout for a paid pod. */
export default function PriceBreakdown({ amount, finance, productCost = 0, spots = 0 }: Readonly<Props>) {
  const { t } = useTranslation();
  const cur = finance.currency_symbol || '₹';
  const f = finance.platform_fee_pct / 100;
  const g = finance.gst_pct / 100;
  const gross = Number(amount) || 0;
  const divisor = (1 + f) * (1 + g);
  const net = divisor > 0 ? gross / divisor : gross;
  const fee = net * f;
  const gst = (net + fee) * g;
  // The host's spot is free, so the product cost is spread over the spots that
  // actually pay (total - 1), never the raw capacity.
  const billable = payableSpots(spots);
  const productShare = productCost > 0 && billable > 0 ? productCost / billable : productCost;
  const finalPayout = Math.max(net - productShare, 0);
  const r = (n: number) => n.toFixed(2);
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1,
        bgcolor: 'action.hover',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(5, 1fr)' },
        gap: 1.5,
        alignItems: 'start',
      }}
    >
      <Box>
        <Typography variant="caption" color="text.secondary">{t('podForm.priceBreakdown.userPays')}</Typography>
        <Typography variant="body2" fontWeight={700}>{cur}{r(gross)}</Typography>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">
          Platform Fee ({finance.platform_fee_pct}%)
        </Typography>
        <Typography variant="body2">{cur}{r(fee)}</Typography>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">GST ({finance.gst_pct}%)</Typography>
        <Typography variant="body2">{cur}{r(gst)}</Typography>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">{t('podForm.priceBreakdown.payoutBeforeProducts')}</Typography>
        <Typography variant="body2" fontWeight={700}>{cur}{r(net)}</Typography>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">{t('podForm.priceBreakdown.productCostPayableSpot')}</Typography>
        <Typography variant="body2">{cur}{r(productShare)}</Typography>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">{t('podForm.priceBreakdown.finalPayout')}</Typography>
        <Typography variant="body2" fontWeight={700} color="primary.main">{cur}{r(finalPayout)}</Typography>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ gridColumn: '1 / -1' }}>
        Duncit product cost is divided across the PAYABLE spots (total − 1, since the host&apos;s spot is
        free) when a spot count is available, then deducted from payout.
      </Typography>
    </Box>
  );
}
