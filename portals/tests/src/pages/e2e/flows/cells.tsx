import { Chip, Stack, Typography } from '@mui/material';
import type { useTranslation } from '@duncit/shell';
import { EM_DASH } from '@duncit/table';
import type { E2eFlowRow, E2eFlowRunStats } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];
type Named = Readonly<{ id: string; name: string; description: string }>;

export const getRowId = (row: Named) => row.id;

/** The name, with the description under it when there is one. */
export const renderNameCell = (row: Named) => (
  <Stack sx={{ gap: 0.25, py: 0.5, minWidth: 0 }}>
    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
      {row.name}
    </Typography>
    {row.description && (
      <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
        {row.description}
      </Typography>
    )}
  </Stack>
);

/** A run count, or a dash for a flow no spec tests yet — "not automated" is not "0 failures". */
export const runCountText = (row: E2eFlowRow, pick: (stats: E2eFlowRunStats) => number) =>
  row.run_stats ? String(pick(row.run_stats)) : EM_DASH;

/**
 * The count on its column's colour — green for passes, red for failures —
 * across the cell. A filled status chip is the theme's soft tint with AA text.
 */
function RunCount({ text, tone }: Readonly<{ text: string; tone: 'success' | 'error' }>) {
  if (text === EM_DASH) {
    return (
      <Typography variant="body2" sx={{ width: '100%', textAlign: 'center', color: 'text.secondary' }}>
        {text}
      </Typography>
    );
  }
  return <Chip size="small" color={tone} label={text} sx={{ width: '100%', fontWeight: 700 }} />;
}

// Built outside the table so the grid never sees a new component type per render.
export const renderPassedCell = (row: E2eFlowRow) => (
  <RunCount text={runCountText(row, (stats) => stats.passed)} tone="success" />
);
export const renderFailedCell = (row: E2eFlowRow) => (
  <RunCount text={runCountText(row, (stats) => stats.failed)} tone="error" />
);

/** Row Edit/Delete buttons that name their row, so ten "Delete" buttons are told apart. */
export const namedActions = (t: Translate) => ({
  edit: { ariaLabel: (row: Named) => t('shell.a11y.editNamed', { vars: { name: row.name } }) },
  delete: { ariaLabel: (row: Named) => t('shell.a11y.deleteNamed', { vars: { name: row.name } }) },
});
