import type { ReactNode } from 'react';
import { Card, CardContent, Stack, Typography } from '@mui/material';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';

interface Props {
  title: string;
  /** Accepted for existing callers, no longer drawn: the title says it. */
  subtitle?: string;
  empty: boolean;
  action?: ReactNode;
  children: ReactNode;
  testId?: string;
}

/** Section card for one insights chart — renders the chart, or a consistent
 * "No data available" empty state when there is nothing to plot. */
export default function InsightChartCard({
  title,
  empty,
  action,
  children,
  testId = 'insight-card',
}: Readonly<Props>) {
  return (
    <Card data-testid={testId}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1, minHeight: 36 }}>
          <Typography data-testid={`${testId}-title`} sx={{ flex: 1, minWidth: 0, fontSize: '1rem', fontWeight: 600 }}>
            {title}
          </Typography>
          {action}
        </Stack>
        {empty ? (
          <Stack
            data-testid={`${testId}-empty`}
            spacing={1}
            sx={{ alignItems: 'center', justifyContent: 'center', py: 4 }}
          >
            <InsightsRoundedIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
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
