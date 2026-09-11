import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { useVirtualRows } from '../../hooks/useVirtualRows';

interface Props<T> {
  rows: readonly T[];
  keyOf: (row: T) => string;
  renderRow: (row: T) => ReactNode;
  /** Height guess for a row that has not been measured yet. */
  estimate: number;
  /** Whatever produced `rows` — the tab and the search. Changing it drops the
   * measured heights, which belonged to other rows. */
  resetKey: string;
  testId: string;
}

/**
 * A contacts list windowed over the page scroll: only the rows inside the
 * viewport (plus overscan) are mounted, between two spacers standing in for
 * the rest, so a phone book of thousands scrolls like one of ten. The maths is
 * `@duncit/virtual-scroll`; `useVirtualRows` is the DOM glue. Native windows
 * the same rows with a FlatList (rule 27).
 */
export default function VirtualRows<T>({
  rows,
  keyOf,
  renderRow,
  estimate,
  resetKey,
  testId,
}: Readonly<Props<T>>) {
  const { listRef, range, measureRow } = useVirtualRows({
    rowCount: rows.length,
    estimateOf: () => estimate,
    gap: 0,
    resetKey,
  });
  const visible = rows.slice(range.start, range.end + 1);
  return (
    <Box ref={listRef} data-testid={testId}>
      {range.leadPad > 0 && <Box sx={{ height: range.leadPad }} />}
      {visible.map((row, offset) => (
        <Box key={keyOf(row)} ref={measureRow(range.start + offset)}>
          {renderRow(row)}
        </Box>
      ))}
      {range.trailPad > 0 && <Box sx={{ height: range.trailPad }} />}
    </Box>
  );
}
