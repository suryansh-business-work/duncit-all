import { Card, CardContent, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PercentSlider from './PercentSlider';
import type { PodProfitInputs } from './types';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  inputs: PodProfitInputs;
  onChange: <K extends keyof PodProfitInputs>(key: K, value: PodProfitInputs[K]) => void;
}

export default function VenueHostCard({ inputs, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardContent>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            mb: 1.5
          }}>
          <StorefrontIcon color="primary" />
          <Typography variant="subtitle1" sx={{
            fontWeight: 800
          }}>{t('finance.calculators.venueAndAmpHostSplit')}</Typography>
        </Stack>
        <Stack spacing={2}>
          <TextField
            label={t('finance.calculators.venueFixedCost')}
            type="number"
            size="small"
            value={inputs.venue_amount}
            onChange={(e) => onChange('venue_amount', Math.max(0, Number(e.target.value)))}
            helperText="The venue's fixed booked slot price (set per venue in Partners). The host keeps whatever remains in the pool."
            fullWidth
            slotProps={{
              input: { startAdornment: <InputAdornment position="start"><CurrencyRupeeIcon fontSize="small" /></InputAdornment> },
              htmlInput: { min: 0, step: 50 }
            }} />
          <PercentSlider
            label={t('finance.calculators.venueCommissionDuncitIncome')}
            value={inputs.venue_commission_percent}
            onChange={(value) => onChange('venue_commission_percent', value)}
            max={50}
            hint="Default deduction Duncit takes from the venue's amount."
          />
          <PercentSlider
            label={t('finance.calculators.hostCommissionDuncitIncome')}
            value={inputs.host_commission_percent}
            onChange={(value) => onChange('host_commission_percent', value)}
            max={50}
            hint="Default deduction Duncit takes from the host's amount."
          />
          <PercentSlider
            label={t('finance.calculators.clubAdminCutDuncitIncome')}
            value={inputs.club_admin_percent}
            onChange={(value) => onChange('club_admin_percent', value)}
            max={50}
            hint="Taken off the pool after GST + platform fee, before the venue/host split. Applies to club pods."
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
