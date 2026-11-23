import type { ReactNode } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { EM_DASH } from './shared';

/** One id a cell shows, with the name it goes by (already translated). */
export interface LabeledId {
  label: string;
  value: string | null | undefined;
}

/** An id that has a value, as `renderValue` receives it. */
export type PresentLabeledId = { label: string; value: string };

const present = (ids: readonly LabeledId[]) =>
  ids.filter((id): id is PresentLabeledId => Boolean(id.value?.trim()));

const plainValue = (id: PresentLabeledId) => (
  <Typography variant="caption" component="span" sx={{ fontFamily: 'monospace' }}>
    {id.value}
  </Typography>
);

/**
 * Several ids for one row, each under its own name — "Razorpay payment pay_…",
 * "Razorpay order order_…", "Duncit ref DPAY-…".
 *
 * A row that carries ids from two systems must never print them as one
 * unlabelled stack: a person comparing against the other system's dashboard
 * reads the first id as "the" id and concludes the two disagree. Every value
 * is monospace, ids without a value are left out, and a row with none shows
 * an em-dash. The same label may repeat (one row per refund id).
 *
 * `renderValue` replaces how a value is drawn — a portal passes one to turn
 * each id into a link to wherever it traces the id. The package stays free of
 * any router: the caller owns the link.
 */
export function LabeledIds({
  ids,
  renderValue = plainValue,
}: Readonly<{ ids: readonly LabeledId[]; renderValue?: (id: PresentLabeledId) => ReactNode }>) {
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
        <Typography key={`${id.label}:${id.value}`} variant="caption" component="span" noWrap>
          <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
            {id.label}{' '}
          </Typography>
          {renderValue(id)}
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
