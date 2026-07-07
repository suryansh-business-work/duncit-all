import { Box, Typography } from '@mui/material';

interface Props {
  amount: number;
  finance: { platform_fee_pct: number; gst_pct: number; currency_symbol?: string };
  productCost?: number;
  spots?: number;
}

/** Live breakdown of platform fee + GST + per-person payout for a paid pod. */
export default function PriceBreakdown({ amount, finance, productCost = 0, spots = 0 }: Readonly<Props>) {
  const cur = finance.currency_symbol || '₹';
  const f = finance.platform_fee_pct / 100;
  const g = finance.gst_pct / 100;
  const gross = Number(amount) || 0;
  const divisor = (1 + f) * (1 + g);
  const net = divisor > 0 ? gross / divisor : gross;
  const fee = net * f;
  const gst = (net + fee) * g;
  const productShare = productCost > 0 && spots > 0 ? productCost / spots : productCost;
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
        <Typography variant="caption" color="text.secondary">User pays</Typography>
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
        <Typography variant="caption" color="text.secondary">Payout before products</Typography>
        <Typography variant="body2" fontWeight={700}>{cur}{r(net)}</Typography>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">Product cost / spot</Typography>
        <Typography variant="body2">{cur}{r(productShare)}</Typography>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">Final payout</Typography>
        <Typography variant="body2" fontWeight={700} color="primary.main">{cur}{r(finalPayout)}</Typography>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ gridColumn: '1 / -1' }}>
        Duncit product cost is divided across spots when spot count is available, then deducted from payout.
      </Typography>
    </Box>
  );
}
