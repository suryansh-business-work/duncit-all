import { Card, CardContent, Rating, Stack, Typography } from '@mui/material';
import { POD_FEEDBACK_ASPECT_LABEL, type PodFeedbackAspect } from '@duncit/utils';
import type { DashboardAspect } from './queries';

interface Props {
  aspects: DashboardAspect[];
  total: number;
  days: number;
}

/**
 * How pods scored, part by part, over the window.
 *
 * Split rather than averaged into one number on purpose: "4.6 overall" and
 * "food 2.4" are the same pods, and only the second tells anyone what to do.
 */
export default function PodRatingsCard({ aspects, total, days }: Readonly<Props>) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
          What guests scored
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {total > 0
            ? `${total} ratings in the last ${days} days`
            : `No ratings in the last ${days} days`}
        </Typography>
        <Stack spacing={1.25} sx={{ mt: 2 }}>
          {aspects.map((row) => (
            <Stack
              key={row.aspect}
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={1.5}
            >
              <Typography variant="body2" fontWeight={600}>
                {POD_FEEDBACK_ASPECT_LABEL[row.aspect as PodFeedbackAspect] ?? row.aspect}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Rating value={row.average} precision={0.1} size="small" readOnly />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ minWidth: 62, textAlign: 'right' }}
                >
                  {row.average.toFixed(1)} · {row.count}
                </Typography>
              </Stack>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
