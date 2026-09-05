import { useMemo, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTabs, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import PodInputsCard from './PodInputsCard';
import VenueHostCard from './VenueHostCard';
import ResultsCard from './ResultsCard';
import MultiPodCalculator from './multi';
import { DEFAULT_INPUTS, type PodProfitInputs } from './types';
import { useCalculator } from './useCalculator';
import { useTranslation } from '@duncit/app-settings';

type CalcTab = 'single' | 'multi';

export default function PodProfitCalculatorPage() {
  const { t } = useTranslation();
  const [inputs, setInputs] = useState<PodProfitInputs>(DEFAULT_INPUTS);
  const results = useCalculator(inputs);

  const tabItems = useMemo<DuncitTabItem<CalcTab>[]>(
    () => [
      { value: 'single', label: t('finance.calculators.singlePod') },
      { value: 'multi', label: t('finance.calculators.multiplePods') },
    ],
    [t]
  );
  const tabs = useTabParam<CalcTab>({ items: tabItems, fallback: 'single' });
  const isSingle = tabs.value === 'single';

  const set = <K extends keyof PodProfitInputs>(key: K, value: PodProfitInputs[K]) =>
    setInputs((prev) => ({ ...prev, [key]: value }));

  const subtitle = isSingle
    ? 'Estimate the venue payout, host payout and Duncit revenue for a pod (ticket × spots) — mirrors the live finance engine.'
    : t('finance.calculators.multiPodIntro');

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.5} sx={{
        alignItems: "center"
      }}>
        <CalculateIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" sx={{
            fontWeight: 800
          }}>{t('finance.calculators.podProfitCalculator')}</Typography>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary"
            }}>
            {subtitle}
          </Typography>
        </Box>
        {isSingle && (
          <DuncitButton
            variant="outlined"
            size="small"
            startIcon={<RestartAltIcon />}
            onClick={() => setInputs(DEFAULT_INPUTS)}
          >
            Reset
          </DuncitButton>
        )}
      </Stack>

      <DuncitTabs {...tabs} />

      {isSingle ? (
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{
          alignItems: "flex-start"
        }}>
          <Stack spacing={2} sx={{ flex: 1, minWidth: 0, width: '100%' }}>
            <PodInputsCard inputs={inputs} onChange={set} />
            <VenueHostCard inputs={inputs} onChange={set} />
          </Stack>
          <Box sx={{ width: { xs: '100%', lg: 360 }, flexShrink: 0 }}>
            <ResultsCard results={results} />
          </Box>
        </Stack>
      ) : (
        <MultiPodCalculator />
      )}
    </Stack>
  );
}
