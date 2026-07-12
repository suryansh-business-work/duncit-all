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
            label="Pod amount (GST-inclusive)"
            type="number"
            size="small"
            value={inputs.pod_amount}
            onChange={(e) => onChange('pod_amount', Math.max(0, Number(e.target.value)))}
            inputProps={{ min: 0, step: 50 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><CurrencyRupeeIcon fontSize="small" /></InputAdornment> }}
            helperText="Total price the customer pays for one pod seat, GST included."
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
