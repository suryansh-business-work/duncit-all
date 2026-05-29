import { Card, CardContent, Stack, Typography } from '@mui/material';

interface Props {
  currency: string;
  subtotal: number;
  fee: number;
  feeAmt: number;
  gst: number;
  gstAmt: number;
  total: number;
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant={bold ? 'subtitle1' : 'body2'} fontWeight={bold ? 700 : 500}>
        {label}
      </Typography>
      <Typography variant={bold ? 'subtitle1' : 'body2'} fontWeight={bold ? 700 : 500}>
        {value}
      </Typography>
    </Stack>
  );
}

export default function PreviewCard({
  currency,
  subtotal,
  fee,
  feeAmt,
  gst,
  gstAmt,
  total,
}: Props) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Preview on {currency}
          {subtotal}
        </Typography>
        <Stack spacing={0.5}>
          <Row label="Subtotal" value={`${currency}${subtotal.toFixed(2)}`} />
          <Row label={`Platform Fee (${fee}%)`} value={`${currency}${feeAmt.toFixed(2)}`} />
          <Row label={`GST (${gst}%)`} value={`${currency}${gstAmt.toFixed(2)}`} />
          <Row label="Total" value={`${currency}${total.toFixed(2)}`} bold />
        </Stack>
      </CardContent>
    </Card>
  );
}
