import type { ReactNode } from 'react';
import { Chip, Stack, Tooltip } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import type { DuncitColumn } from '@duncit/table';
import type { useTranslation } from '@duncit/shell';

type Translate = ReturnType<typeof useTranslation>['t'];

/** A row the server flagged as sharing a phone, email or website with another lead. */
export interface DuplicateFlagged {
  is_duplicate?: boolean | null;
}

/** The Leads listing's red row for a duplicate lead; untouched otherwise. */
export const duplicateRowStyle = (theme: Theme) => (row: DuplicateFlagged) =>
  row.is_duplicate
    ? { backgroundColor: alpha(theme.palette.error.main, 0.12), boxShadow: `inset 4px 0 0 ${theme.palette.error.main}` }
    : undefined;

/**
 * Puts a "Duplicate" chip beside the name in the first column, so the red row
 * is never the only cue (WCAG 1.4.1) and a screen reader hears it.
 */
export function withDuplicateMark<T extends DuplicateFlagged>(columns: DuncitColumn<T>[], t: Translate): DuncitColumn<T>[] {
  const [first, ...rest] = columns;
  if (!first?.cellRenderer) return columns;
  const renderName = first.cellRenderer;
  const cellRenderer = (row: T): ReactNode =>
    row.is_duplicate ? (
      <Stack direction="row" spacing={1} component="span" sx={{ alignItems: 'center', minWidth: 0 }}>
        {renderName(row)}
        <Tooltip title={t('crm.duplicates.rowHint')}>
          <Chip
            size="small"
            color="error"
            variant="outlined"
            icon={<ContentCopyIcon />}
            label={t('crm.duplicates.rowLabel')}
            data-testid="lead-duplicate-chip"
          />
        </Tooltip>
      </Stack>
    ) : (
      renderName(row)
    );
  return [{ ...first, cellRenderer }, ...rest];
}
