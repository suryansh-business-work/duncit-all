import { useMemo } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import { DuncitTabs, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { useTranslation } from '@duncit/app-settings';
import MultiPodCalculator from './multi';
import SinglePodTab from './single';

type CalcTab = 'single' | 'multi';

export default function PodProfitCalculatorPage() {
  const { t } = useTranslation();

  const tabItems = useMemo<DuncitTabItem<CalcTab>[]>(
    () => [
      { value: 'single', label: t('finance.calculators.singlePod') },
      { value: 'multi', label: t('finance.calculators.multiplePods') },
    ],
    [t]
  );
  const tabs = useTabParam<CalcTab>({ items: tabItems, fallback: 'single' });
  const isSingle = tabs.value === 'single';

  const subtitle = isSingle
    ? t('finance.calculators.singlePodIntro')
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
      </Stack>

      <DuncitTabs {...tabs} />

      {isSingle ? <SinglePodTab /> : <MultiPodCalculator />}
    </Stack>
  );
}
