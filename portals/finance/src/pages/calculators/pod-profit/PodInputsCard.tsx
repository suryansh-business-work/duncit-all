import { Card, CardContent, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PercentSlider from './PercentSlider';
import type { PodProfitInputs } from './types';

interface Props {
  inputs: PodProfitInputs;
  onChange: <K extends keyof PodProfitInputs>(key: K, value: PodProfitInputs[K]) => void;
}

export default function PodInputsCard({ inputs, onChange }: Readonly<Props>) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <ReceiptLongIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={800}>Pod pricing</Typography>
        </Stack>
        <Stack spacing={2}>
          <TextField
            label="Ticket price per spot (GST-inclusive)"
            type="number"
            size="small"
            value={inputs.pod_amount}
            onChange={(e) => onChange('pod_amount', Math.max(0, Number(e.target.value)))}
            inputProps={{ min: 0, step: 50 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><CurrencyRupeeIcon fontSize="small" /></InputAdornment> }}
            helperText="Price the customer pays for one spot, GST included."
            fullWidth
          />
          <TextField
            label="No. of spots"
            type="number"
            size="small"
            value={inputs.no_of_spots}
            onChange={(e) => onChange('no_of_spots', Math.max(0, Math.round(Number(e.target.value))))}
            inputProps={{ min: 0, step: 1 }}
            helperText="Pod capacity — for physical pods this is the venue space's available spots. The waterfall runs on ticket × spots."
            fullWidth
          />
          <PercentSlider
            label="GST"
            value={inputs.gst_percent}
            onChange={(value) => onChange('gst_percent', value)}
            max={28}
            hint="Extracted from the GST-inclusive pod amount and remitted to the government."
          />
          <PercentSlider
            label="Platform fee — Duncit income"
            value={inputs.platform_fee_percent}
            onChange={(value) => onChange('platform_fee_percent', value)}
            hint="Duncit's platform fee, charged on the net (post-GST) amount."
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
