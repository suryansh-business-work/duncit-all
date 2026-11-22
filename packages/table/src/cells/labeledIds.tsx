import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { EM_DASH } from './shared';

/** One id a cell shows, with the name it goes by (already translated). */
export interface LabeledId {
  label: string;
  value: string | null | undefined;
}

const present = (ids: readonly LabeledId[]) =>
  ids.filter((id): id is { label: string; value: string } => Boolean(id.value?.trim()));

/**
 * Several ids for one row, each under its own name — "Razorpay payment pay_…",
 * "Razorpay order order_…", "Duncit ref DPAY-…".
 *
 * A row that carries ids from two systems must never print them as one
 * unlabelled stack: a person comparing against the other system's dashboard
 * reads the first id as "the" id and concludes the two disagree. Every value
 * is monospace, ids without a value are left out, and a row with none shows
 * an em-dash.
 */
export function LabeledIds({ ids }: Readonly<{ ids: readonly LabeledId[] }>) {
  const shown = present(ids);
  if (shown.length === 0) {
    return (
      <Typography variant="caption" component="span">
        {EM_DASH}
      </Typography>
    );
  }
  return (
    <Stack component="span" sx={{ lineHeight: 1.2, minWidth: 0 }}>
      {shown.map((id) => (
        <Typography key={id.label} variant="caption" component="span" noWrap>
          <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
            {id.label}{' '}
          </Typography>
          <Typography variant="caption" component="span" sx={{ fontFamily: 'monospace' }}>
            {id.value}
          </Typography>
        </Typography>
      ))}
    </Stack>
  );
}

/** The same ids as one line of text — the cell's export, copy and quick-filter value. */
export function labeledIdsText(ids: readonly LabeledId[]): string {
  const shown = present(ids);
  return shown.length === 0 ? EM_DASH : shown.map((id) => `${id.label}: ${id.value}`).join(' · ');
}
