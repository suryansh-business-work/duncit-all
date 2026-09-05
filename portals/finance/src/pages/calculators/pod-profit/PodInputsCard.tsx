import { Card, CardContent, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PercentSlider from './PercentSlider';
import type { PodProfitInputs } from './types';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  inputs: PodProfitInputs;
  onChange: <K extends keyof PodProfitInputs>(key: K, value: PodProfitInputs[K]) => void;
}

export default function PodInputsCard({ inputs, onChange }: Readonly<Props>) {
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
          <ReceiptLongIcon color="primary" />
          <Typography variant="subtitle1" sx={{
            fontWeight: 800
          }}>{t('finance.calculators.podPricing')}</Typography>
        </Stack>
        <Stack spacing={2}>
          <TextField
            label={t('finance.calculators.ticketPricePerSpotGstInclusive')}
            type="number"
            size="small"
            value={inputs.pod_amount}
            onChange={(e) => onChange('pod_amount', Math.max(0, Number(e.target.value)))}
            helperText={t('finance.calculators.priceTheCustomerPaysForOne')}
            fullWidth
            slotProps={{
              input: { startAdornment: <InputAdornment position="start"><CurrencyRupeeIcon fontSize="small" /></InputAdornment> },
              htmlInput: { min: 0, step: 50 }
            }} />
          <TextField
            label={t('finance.calculators.noOfSpots')}
            type="number"
            size="small"
            value={inputs.no_of_spots}
            onChange={(e) => onChange('no_of_spots', Math.max(0, Math.round(Number(e.target.value))))}
            helperText="Pod capacity including the host's own seat — for physical pods this is the venue space's available spots. The host's spot is free, so the waterfall runs on ticket × (spots − 1)."
            fullWidth
            slotProps={{
              htmlInput: { min: 0, step: 1 }
            }}
          />
          <TextField
            label={t('finance.calculators.totalNumberOfPods')}
            type="number"
            size="small"
            value={inputs.pod_count}
            onChange={(e) => onChange('pod_count', Math.max(1, Math.round(Number(e.target.value) || 1)))}
            helperText={t('finance.calculators.totalNumberOfPodsHint')}
            fullWidth
            slotProps={{
              htmlInput: { min: 1, step: 1 }
            }}
          />
          <PercentSlider
            label="GST"
            value={inputs.gst_percent}
            onChange={(value) => onChange('gst_percent', value)}
            max={28}
            hint="Extracted from the GST-inclusive pod amount and remitted to the government."
          />
          <PercentSlider
            label={t('finance.calculators.platformFeeDuncitIncome')}
            value={inputs.platform_fee_percent}
            onChange={(value) => onChange('platform_fee_percent', value)}
            hint="Duncit's platform fee, charged on the net (post-GST) amount."
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
