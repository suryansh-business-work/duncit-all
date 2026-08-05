import { Chip, Rating, Stack, Typography } from '@mui/material';
import type { PodFeedbackRow } from './queries';
import { fmtDateTime } from './format';

interface Props {
  row: PodFeedbackRow;
  /** Aspect -> label, passed in so the card and its entries agree. */
  label: (aspect: string) => string;
}

/**
 * One guest's rating: their overall stars, what they wrote, and the parts they
 * scored separately — shown as chips so a row of "Venue 2" stands out from a
 * row of fives without anyone reading a table.
 */
export default function PodFeedbackEntry({ row, label }: Readonly<Props>) {
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
        <Rating value={row.rating} size="small" readOnly />
        <Typography variant="body2" fontWeight={600}>
          {row.user.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {fmtDateTime(row.created_at)}
        </Typography>
      </Stack>
      {row.message && <Typography variant="body2">{row.message}</Typography>}
      {row.ratings.length > 0 && (
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {row.ratings.map((entry) => (
            <Chip
              key={entry.aspect}
              size="small"
              variant="outlined"
              // Below three stars is the part that went wrong — the one an
              // admin is looking for.
              color={entry.rating <= 2 ? 'error' : 'default'}
              label={`${label(entry.aspect)} ${entry.rating}`}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
