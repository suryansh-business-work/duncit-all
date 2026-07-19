import type { ReactNode } from 'react';
import { Card, CardContent, Stack, Typography } from '@mui/material';

interface Props {
  title: string;
  subtitle?: string;
  empty: boolean;
  action?: ReactNode;
  children: ReactNode;
}

/** Section card for one insights chart — renders the chart, or a consistent
 * "No data available" empty state when there is nothing to plot. */
export default function InsightChartCard({ title, subtitle, empty, action, children }: Readonly<Props>) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 4 }}>
      <CardContent>
        <Stack direction="row" alignItems="flex-start" spacing={1} sx={{ mb: 1 }}>
          <Stack sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            ) : null}
          </Stack>
          {action}
        </Stack>
        {empty ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 5 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={700}>
              No data available
            </Typography>
          </Stack>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
