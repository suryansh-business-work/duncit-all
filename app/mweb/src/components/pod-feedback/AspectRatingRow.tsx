import { Rating, Stack, Typography } from '@mui/material';

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
  /** Screen-reader text for each star, e.g. "Rate Host 3 out of 5". */
  starLabel: (stars: number) => string;
}

/**
 * One line of the rating sheet: what is being scored, and its stars.
 *
 * Each part of a pod gets its own row rather than one blanket score, because a
 * guest who loved the evening and was let down by the room has said two
 * different things — and only the split version tells anyone what to fix.
 */
export default function AspectRatingRow({ label, value, onChange, starLabel }: Readonly<Props>) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={1.5}
      sx={{ py: 0.25 }}
    >
      <Typography variant="body2" fontWeight={600} sx={{ minWidth: 0 }}>
        {label}
      </Typography>
      <Rating
        value={value || null}
        onChange={(_event, next) => onChange(next ?? 0)}
        getLabelText={starLabel}
        sx={{ flexShrink: 0 }}
      />
    </Stack>
  );
}
