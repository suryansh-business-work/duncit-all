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

/** Dependency-free bar chart (animated CSS heights) for the studio dashboards:
 * a green bar rising inside a soft pill track. Native twin: SimpleBarChart. */
export default function SimpleBarChart({ data, height = 120 }: Readonly<Props>) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <Stack
      direction="row"
      spacing={1.25}
      sx={{
        alignItems: "flex-end",
        height,
        pt: 1
      }}>
      {data.map((d) => (
        <Stack
          key={d.label}
          spacing={0.5}
          sx={{
            alignItems: "center",
            flex: 1,
            height: '100%'
          }}>
          {/* The track fills this flex slot, so the value/label rows can never
              overflow the card (overlap fix, B4-1). */}
          <Typography variant="caption" sx={{ fontWeight: 700, lineHeight: 1 }}>
            {d.value}
          </Typography>
          <Box
            sx={{
              position: 'relative',
              flex: 1,
              width: '100%',
              maxWidth: 28,
              borderRadius: 999,
              overflow: 'hidden',
              bgcolor: 'action.hover',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                insetInline: 0,
                bottom: 0,
                height: `${(d.value / max) * 100}%`,
                borderRadius: 999,
                bgcolor: 'primary.main',
                transition: 'height 300ms cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
            />
          </Box>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 600
            }}>
            {d.label}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}
