import { Stack, Typography } from '@mui/material';

/**
 * One labelled value on a record page.
 *
 * Every console's read-only sections are built out of these, so a venue's owner
 * email and a club admin's commission line up the same way and an empty one
 * always reads as an em-dash rather than as a blank the reader has to interpret
 * (rule 34).
 */
const EMPTY = '—';

export interface FactProps {
  label: string;
  value: string;
  /** Bold the value — for the summary strip, where it is the headline. */
  strong?: boolean;
}

export default function Fact({ label, value, strong = false }: Readonly<FactProps>) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: strong ? 700 : 400 }}>
        {value || EMPTY}
      </Typography>
    </Stack>
  );
}
