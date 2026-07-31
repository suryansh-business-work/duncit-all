import { Box, Card, CardContent, Stack, Tooltip, Typography } from '@mui/material';

interface Props {
  daily: { date: string; count: number }[];
  formatDate: (value: Date | string) => string;
}

/** Clicks per day for the last 30 days. Plain bars rather than a charting
 * dependency — the shape and the peak are the whole question here. */
export default function ClicksOverTime({ daily, formatDate }: Readonly<Props>) {
  const peak = daily.reduce((max, point) => Math.max(max, point.count), 0);

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
          Clicks over time
        </Typography>

        {daily.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No clicks in the last 30 days.
          </Typography>
        )}

        {daily.length > 0 && (
          <Stack direction="row" alignItems="flex-end" spacing={0.5} sx={{ height: 140 }}>
            {daily.map((point) => (
              <Tooltip
                key={point.date}
                title={`${formatDate(point.date)} — ${point.count.toLocaleString()} clicks`}
              >
                <Box
                  data-testid="click-bar"
                  sx={{
                    flex: 1,
                    minWidth: 4,
                    // peak is 0 only when there are no points, and then this
                    // branch does not render.
                    height: `${Math.max(4, Math.round((point.count / peak) * 100))}%`,
                    bgcolor: 'primary.main',
                    borderRadius: 0.5,
                  }}
                />
              </Tooltip>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
