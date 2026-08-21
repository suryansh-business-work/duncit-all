import { Link as RouterLink } from 'react-router-dom';
import { Card, CardContent, Chip, Link, Rating, Stack, Typography } from '@mui/material';
import type { DashboardPod } from './queries';
import { formatDateTime } from '@duncit/app-settings';

interface Props {
  title: string;
  subtitle: string;
  pods: DashboardPod[];
  emptyText: string;
  /** Show stars instead of the start time — the rated lists lead with a score. */
  showRating?: boolean;
}

const when = (iso: string | null) => formatDateTime(iso) || '—';

/**
 * A short list of pods with the one number that list is about — its rating, or
 * when it starts. Every row links straight to the pod, because the list exists
 * to be acted on.
 */
export default function PodListCard({
  title,
  subtitle,
  pods,
  emptyText,
  showRating = false,
}: Readonly<Props>) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
        <Stack spacing={1.25} sx={{ mt: 2 }}>
          {pods.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              {emptyText}
            </Typography>
          )}
          {pods.map((pod) => (
            <Stack
              key={pod.id}
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={1.5}
            >
              <Stack sx={{ minWidth: 0 }}>
                <Link
                  component={RouterLink}
                  to={`/pods/${pod.id}`}
                  variant="body2"
                  fontWeight={600}
                  noWrap
                  underline="hover"
                >
                  {pod.title}
                </Link>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {showRating ? `${pod.rating_count} ratings` : when(pod.starts_at)}
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
                {showRating && pod.rating_average !== null && (
                  <>
                    <Rating value={pod.rating_average} precision={0.1} size="small" readOnly />
                    <Typography variant="caption" color="text.secondary">
                      {pod.rating_average.toFixed(1)}
                    </Typography>
                  </>
                )}
                {!showRating && (
                  <Chip size="small" variant="outlined" label={`${pod.filled}/${pod.spots}`} />
                )}
              </Stack>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
