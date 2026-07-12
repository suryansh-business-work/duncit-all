import { useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PodInputsCard from './PodInputsCard';
import VenueHostCard from './VenueHostCard';
import ResultsCard from './ResultsCard';
import { DEFAULT_INPUTS, type PodProfitInputs } from './types';
import { useCalculator } from './useCalculator';

export default function PodProfitCalculatorPage() {
  const [inputs, setInputs] = useState<PodProfitInputs>(DEFAULT_INPUTS);
  const results = useCalculator(inputs);

  const set = <K extends keyof PodProfitInputs>(key: K, value: PodProfitInputs[K]) =>
    setInputs((prev) => ({ ...prev, [key]: value }));

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <CalculateIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800}>Pod Profit Calculator</Typography>
          <Typography variant="body2" color="text.secondary">
            Estimate the venue payout, host payout and Duncit revenue for a pod (ticket × spots) — mirrors the live finance engine.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<RestartAltIcon />}
          onClick={() => setInputs(DEFAULT_INPUTS)}
        >
          Reset
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="flex-start">
        <Stack spacing={2} sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          <PodInputsCard inputs={inputs} onChange={set} />
          <VenueHostCard inputs={inputs} onChange={set} />
        </Stack>
        <Box sx={{ width: { xs: '100%', lg: 360 }, flexShrink: 0 }}>
          <ResultsCard results={results} />
        </Box>
      </Stack>
    </Stack>
  );
}
