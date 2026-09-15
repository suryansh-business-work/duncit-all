import { Stack, Typography } from '@mui/material';
import type { useTranslation } from '@duncit/shell';

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

/** Row Edit/Delete buttons that name their row, so ten "Delete" buttons are told apart. */
export const namedActions = (t: Translate) => ({
  edit: { ariaLabel: (row: Named) => t('shell.a11y.editNamed', { vars: { name: row.name } }) },
  delete: { ariaLabel: (row: Named) => t('shell.a11y.deleteNamed', { vars: { name: row.name } }) },
});
