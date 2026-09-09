import type { ReactNode } from 'react';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';

interface Props {
  title: string;
  hint?: string;
  /** False when there is nothing to draw — an empty chart reads as a broken one. */
  hasData: boolean;
  height?: number;
  children: ReactNode;
}

/**
 * The frame every chart on this page sits in.
 *
 * Written once so the title, the hint and — above all — the empty state are the
 * same in all three places. Chart.js draws an axis and a legend perfectly
 * happily for a dataset of zeroes, which looks like a chart that is wrong
 * rather than one with nothing to say yet.
 */
export default function ChartCard({
  title,
  hint,
  hasData,
  height = 260,
  children,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Card sx={{ flex: 1, minWidth: 0 }}>
      <CardContent>
        <Stack spacing={0.25} sx={{ mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          {hint ? (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {hint}
            </Typography>
          ) : null}
        </Stack>
        <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {hasData ? (
            children
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('finance.calculators.chartNoData')}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
