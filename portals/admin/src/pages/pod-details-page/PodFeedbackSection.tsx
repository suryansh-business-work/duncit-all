import { useQuery } from '@apollo/client';
import {
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Rating,
  Stack,
  Typography,
} from '@mui/material';
import StarRateIcon from '@mui/icons-material/StarRate';
import { POD_FEEDBACK_ASPECT_LABEL, type PodFeedbackAspect } from '@duncit/utils';
import { POD_FEEDBACK_SUMMARY, type PodAspectRating, type PodFeedbackRow } from './queries';
import PodFeedbackEntry from './PodFeedbackEntry';

const aspectLabel = (aspect: string) =>
  POD_FEEDBACK_ASPECT_LABEL[aspect as PodFeedbackAspect] ?? aspect;

/** One averaged part — the label, its stars and how many people said so. */
function AspectAverage({ row }: Readonly<{ row: PodAspectRating }>) {
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
      <Typography variant="body2" fontWeight={600}>
        {aspectLabel(row.aspect)}
      </Typography>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Rating value={row.average} precision={0.1} size="small" readOnly />
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 62, textAlign: 'right' }}>
          {row.average.toFixed(1)} · {row.count}
        </Typography>
      </Stack>
    </Stack>
  );
}

/**
 * "Ratings" card on the pod detail page: what guests scored this pod on, part
 * by part, and the ratings themselves.
 *
 * The averages come first because that is the question an admin opens the page
 * with — "was this pod any good?" — and the individual comments underneath say
 * why.
 */
export default function PodFeedbackSection({ podId }: Readonly<{ podId: string }>) {
  const { data, loading, error } = useQuery(POD_FEEDBACK_SUMMARY, {
    variables: { pod_id: podId },
    skip: !podId,
    fetchPolicy: 'cache-and-network',
  });
  const summary = data?.podFeedbackSummary;

  if (error) {
    return (
      <Typography variant="caption" color="text.secondary">
        Ratings are not available for this pod.
      </Typography>
    );
  }

  const aspects: PodAspectRating[] = summary?.aspects ?? [];
  const recent: PodFeedbackRow[] = summary?.recent ?? [];

  const body = () => {
    if (!summary) {
      return loading ? (
        <Stack alignItems="center" sx={{ py: 2 }}>
          <CircularProgress size={20} />
        </Stack>
      ) : null;
    }
    if (summary.total === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          No one has rated this pod yet.
        </Typography>
      );
    }
    return (
      <Stack spacing={1.5}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Typography variant="h4" fontWeight={900}>
            {summary.overall_average.toFixed(1)}
          </Typography>
          <Stack>
            <Rating value={summary.overall_average} precision={0.1} readOnly />
            <Typography variant="caption" color="text.secondary">
              {summary.total} {summary.total === 1 ? 'rating' : 'ratings'}
            </Typography>
          </Stack>
        </Stack>
        <Divider />
        <Stack spacing={1}>
          {aspects.map((row) => (
            <AspectAverage key={row.aspect} row={row} />
          ))}
        </Stack>
        {recent.length > 0 && (
          <>
            <Divider />
            <Stack spacing={1.5}>
              {recent.map((row) => (
                <PodFeedbackEntry key={row.id} row={row} label={aspectLabel} />
              ))}
            </Stack>
          </>
        )}
      </Stack>
    );
  };

  return (
    <Card variant="outlined" sx={{ flex: 1, minWidth: 0, width: '100%' }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <StarRateIcon fontSize="small" color="warning" />
          <Typography variant="subtitle1" fontWeight={800}>
            Ratings
          </Typography>
          {summary && summary.total > 0 && (
            <Chip size="small" label={`${summary.total}`} variant="outlined" />
          )}
        </Stack>
        {body()}
      </CardContent>
    </Card>
  );
}
