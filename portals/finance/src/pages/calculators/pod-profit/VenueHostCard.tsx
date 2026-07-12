import { Card, CardContent, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PercentSlider from './PercentSlider';
import type { PodProfitInputs } from './types';

interface Props {
  inputs: PodProfitInputs;
  onChange: <K extends keyof PodProfitInputs>(key: K, value: PodProfitInputs[K]) => void;
}

export default function VenueHostCard({ inputs, onChange }: Readonly<Props>) {
  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <StorefrontIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={800}>Venue &amp; host split</Typography>
        </Stack>
        <Stack spacing={2}>
          <TextField
            label="Venue fixed cost"
            type="number"
            size="small"
            value={inputs.venue_amount}
            onChange={(e) => onChange('venue_amount', Math.max(0, Number(e.target.value)))}
            inputProps={{ min: 0, step: 50 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><CurrencyRupeeIcon fontSize="small" /></InputAdornment> }}
            helperText="The venue's fixed booked slot price (set per venue in Partners). The host keeps whatever remains in the pool."
            fullWidth
          />
          <PercentSlider
            label="Venue commission — Duncit income"
            value={inputs.venue_commission_percent}
            onChange={(value) => onChange('venue_commission_percent', value)}
            max={50}
            hint="Default deduction Duncit takes from the venue's amount."
          />
          <PercentSlider
            label="Host commission — Duncit income"
            value={inputs.host_commission_percent}
            onChange={(value) => onChange('host_commission_percent', value)}
            max={50}
            hint="Default deduction Duncit takes from the host's amount."
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
