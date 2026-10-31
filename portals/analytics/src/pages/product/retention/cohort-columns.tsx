import { Box } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import type { DuncitColumn } from '@duncit/table';
import { asCount, asPercent, type Translate } from '../labels';

export interface CohortRow {
  id: string;
  cohort: string;
  size: number;
  /** % retained per offset; null where the day or week has not come yet. */
  retained: ReadonlyArray<number | null>;
}

/** A retention cell shaded by its value — a darker cell kept more people. "Not yet" stays blank, never 0. */
function HeatCell({ value, theme }: Readonly<{ value: number | null; theme: Theme }>) {
  const shade = value === null ? 'transparent' : alpha(theme.palette.primary.main, Math.min(0.85, 0.08 + value / 100));
  return (
    <Box sx={{ px: 1, bgcolor: shade, color: value !== null && value > 55 ? 'primary.contrastText' : 'text.primary' }}>
      {asPercent(value)}
    </Box>
  );
}

/** Cohort, size, then one column per day (D1…D30) or week (W1…W8). */
export function cohortColumns(
  t: Translate,
  theme: Theme,
  offsets: readonly number[],
  daily: boolean,
  formatCohort: (row: CohortRow) => string
): Array<DuncitColumn<CohortRow>> {
  const fixed = { type: 'number' as const, sortable: false, filterable: false };
  return [
    {
      field: 'cohort',
      headerName: t('analytics.product.retention.cohort'),
      type: 'text',
      minWidth: 150,
      sortable: false,
      filterable: false,
      cellRenderer: formatCohort,
    },
    { field: 'size', headerName: t('analytics.product.retention.size'), width: 100, ...fixed, cellRenderer: (row) => asCount(row.size) },
    ...offsets.map(
      (offset, index): DuncitColumn<CohortRow> => ({
        field: `retained.${index}`,
        headerName: t(daily ? 'analytics.product.retention.day' : 'analytics.product.retention.week', { vars: { n: offset } }),
        width: 96,
        ...fixed,
        cellRenderer: (row) => <HeatCell value={row.retained[index] ?? null} theme={theme} />,
      })
    ),
  ];
}
