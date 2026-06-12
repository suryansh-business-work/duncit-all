import { Box, Stack, Typography } from '@mui/material';

export interface BarDatum {
  label: string;
  value: number;
}

/** Buckets ISO dates into "MMM" month counts — last `back` + next `ahead` months. */
export function buildMonthlyCounts(dates: (string | null | undefined)[], back = 2, ahead = 3): BarDatum[] {
  const now = new Date();
  const buckets: { key: string; label: string; value: number }[] = [];
  for (let offset = -back; offset <= ahead; offset += 1) {
    const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    buckets.push({
      key: `${month.getFullYear()}-${month.getMonth()}`,
      label: month.toLocaleString('en', { month: 'short' }),
      value: 0,
    });
  }
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  dates.forEach((iso) => {
    if (!iso) return;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return;
    const bucket = byKey.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (bucket) bucket.value += 1;
  });
  return buckets.map(({ label, value }) => ({ label, value }));
}

interface Props {
  data: BarDatum[];
  height?: number;
}

/** Dependency-free bar chart (animated CSS heights) for the studio dashboards. */
export default function SimpleBarChart({ data, height = 120 }: Readonly<Props>) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <Stack direction="row" spacing={1.25} alignItems="flex-end" sx={{ height, pt: 1 }}>
      {data.map((d) => (
        <Stack key={d.label} spacing={0.5} alignItems="center" sx={{ flex: 1, height: '100%' }}>
          {/* The bar scales inside this flex track, so the value/label rows can
              never overflow the card (overlap fix, B4-1). */}
          <Stack spacing={0.5} alignItems="center" sx={{ flex: 1, width: '100%', justifyContent: 'flex-end' }}>
            <Typography variant="caption" sx={{ fontWeight: 900, lineHeight: 1 }}>
              {d.value}
            </Typography>
            <Box
              sx={{
                width: '100%',
                maxWidth: 34,
                height: `${Math.max(4, (d.value / max) * 82)}%`,
                borderRadius: 1.5,
                background: d.value > 0 ? 'linear-gradient(180deg, #ff7a59 0%, #ff4f73 100%)' : undefined,
                bgcolor: d.value > 0 ? undefined : 'action.hover',
                transition: 'height 300ms cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
            />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
            {d.label}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}
