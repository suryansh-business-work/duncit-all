import { Card, CardContent, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import EventSeatIcon from '@mui/icons-material/EventSeat';
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
          <EventSeatIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={800}>Pod pricing</Typography>
        </Stack>
        <Stack spacing={2}>
          <TextField
            label="Pod cost (gross)"
            type="number"
            size="small"
            value={inputs.pod_cost}
            onChange={(e) => onChange('pod_cost', Math.max(0, Number(e.target.value)))}
            inputProps={{ min: 0, step: 50 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><CurrencyRupeeIcon fontSize="small" /></InputAdornment> }}
            helperText="Ticket price the user pays for one pod seat."
            fullWidth
          />
          <PercentSlider
            label="GST"
            value={inputs.gst_percent}
            onChange={(value) => onChange('gst_percent', value)}
            max={28}
            hint="Tax collected on the pod cost. Shown separately — not part of Duncit profit."
          />
          <PercentSlider
            label="Platform fees — Duncit income"
            value={inputs.platform_fee_percent}
            onChange={(value) => onChange('platform_fee_percent', value)}
            hint="Slice of pod cost Duncit keeps as platform fee before the host split."
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
