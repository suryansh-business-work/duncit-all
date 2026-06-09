import { Card, CardContent, LinearProgress, Stack, Typography } from '@mui/material';

type BarColor = 'primary' | 'success' | 'warning' | 'error';

/** Color the usage bar by how full it is. */
export function usageColor(percent: number): BarColor {
  if (percent >= 90) return 'error';
  if (percent >= 75) return 'warning';
  return 'success';
}

export default function StatCard({
  label,
  value,
  sub,
  percent,
}: {
  label: string;
  value: string;
  sub?: string;
  percent?: number;
}) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.3 }}>
          {label}
        </Typography>
        <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 0.5 }}>
          <Typography variant="h5" fontWeight={800} noWrap>
            {value}
          </Typography>
          {sub && (
            <Typography variant="body2" color="text.secondary" noWrap>
              {sub}
            </Typography>
          )}
        </Stack>
        {percent !== undefined && (
          <LinearProgress
            variant="determinate"
            value={Math.max(0, Math.min(100, percent))}
            color={usageColor(percent)}
            sx={{ mt: 1.25, height: 6, borderRadius: 3 }}
          />
        )}
      </CardContent>
    </Card>
  );
}
