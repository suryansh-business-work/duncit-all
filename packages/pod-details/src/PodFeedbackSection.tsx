import { useQuery } from '@apollo/client';
import { Divider, Rating, Stack, Typography } from '@mui/material';
import StarRateIcon from '@mui/icons-material/StarRate';
import { POD_FEEDBACK_ASPECT_LABEL, type PodFeedbackAspect } from '@duncit/utils';
import SectionCard from './SectionCard';
import { type PodAspectRating, type PodFeedbackRow } from './queries';
import { usePodDetailsScope } from './scope';
import PodFeedbackEntry from './PodFeedbackEntry';
import { useTranslation } from './i18n/useTranslation';

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
        {/* Fixed width so every "4.5 · 12" ends on the same right edge. */}
        <Typography variant="caption" color="text.secondary" sx={{ width: 56, textAlign: 'right' }}>
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
  const { t } = useTranslation();
  const scopeDocs = usePodDetailsScope();
  const { data, loading, error } = useQuery(scopeDocs.feedback, {
    variables: { pod_id: podId },
    skip: !podId,
    fetchPolicy: 'cache-and-network',
  });
  const summary = data?.podFeedbackSummary;
  const aspects: PodAspectRating[] = summary?.aspects ?? [];
  const recent: PodFeedbackRow[] = summary?.recent ?? [];
  const rated = Boolean(summary && summary.total > 0);

  return (
    <SectionCard
      icon={<StarRateIcon fontSize="small" />}
      title={t('podDetailsPanel.podFeedbackSection.ratings')}
      tone="warning"
      badge={rated ? summary?.total : undefined}
      loading={loading && !summary}
      error={error ? 'Ratings are not available for this pod.' : null}
      empty={summary && !rated ? 'No one has rated this pod yet.' : null}
    >
      {rated && summary && (
        <Stack spacing={2}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="h3" fontWeight={900} lineHeight={1}>
              {summary.overall_average.toFixed(1)}
            </Typography>
            <Stack spacing={0.25}>
              <Rating value={summary.overall_average} precision={0.1} readOnly />
              <Typography variant="caption" color="text.secondary">
                {summary.total} {summary.total === 1 ? 'rating' : 'ratings'}
              </Typography>
            </Stack>
          </Stack>
          <Divider />
          <Stack spacing={1.25}>
            {aspects.map((row) => (
              <AspectAverage key={row.aspect} row={row} />
            ))}
          </Stack>
          {recent.length > 0 && (
            <>
              <Divider />
              <Stack spacing={2} divider={<Divider flexItem />}>
                {recent.map((row) => (
                  <PodFeedbackEntry key={row.id} row={row} label={aspectLabel} />
                ))}
              </Stack>
            </>
          )}
        </Stack>
      )}
    </SectionCard>
  );
}
