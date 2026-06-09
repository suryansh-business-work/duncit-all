import { Box, Divider, Stack, Typography } from '@mui/material';

interface Props {
  amount: number;
  isFree: boolean;
  priceCompute: (amt: number) => {
    subtotal: number;
    fee: number;
    feePct: number;
    gst: number;
    gstPct: number;
    total: number;
    currency: string;
  };
}

export default function PodPaymentDetailsSection({
  amount,
  isFree,
  priceCompute,
}: Readonly<Props>) {
  if (isFree || !Number(amount)) {
    return (
      <Typography variant="body2" color="text.secondary">
        This pod is free to join. No payment required.
      </Typography>
    );
  }
  const p = priceCompute(amount);
  const Row = ({ label, value }: { label: string; value: string }) => (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {value}
      </Typography>
    </Stack>
  );
  return (
    <Box>
      <Row label="Base price" value={`${p.currency}${p.subtotal.toFixed(2)}`} />
      <Row
        label={`Platform fee (${p.feePct}%)`}
        value={`${p.currency}${p.fee.toFixed(2)}`}
      />
      <Row label={`GST (${p.gstPct}%)`} value={`${p.currency}${p.gst.toFixed(2)}`} />
      <Divider sx={{ my: 1 }} />
      <Stack direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          Total payable
        </Typography>
        <Typography variant="subtitle2" fontWeight={700}>
          {p.currency}
          {p.total.toFixed(2)}
        </Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        All charges are inclusive of platform fee and GST.
      </Typography>
    </Box>
  );
}
