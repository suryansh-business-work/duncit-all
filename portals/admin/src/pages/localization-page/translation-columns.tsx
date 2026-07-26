import { Chip, Stack, Typography } from '@mui/material';
import type { DuncitColumn } from '@duncit/table';
import { valueFor, type LocaleRow, type TranslationRow } from './queries';

interface ColumnArgs {
  locales: LocaleRow[];
  formatDateTime: (value: string) => string;
}

/**
 * One column per active locale, so a translator sees every language for a
 * string on a single row and can spot gaps at a glance. Untranslated cells are
 * marked rather than left blank, because blank reads as "translated to empty".
 */
export function getTranslationColumns({
  locales,
  formatDateTime,
}: Readonly<ColumnArgs>): DuncitColumn<TranslationRow>[] {
  const localeColumns: DuncitColumn<TranslationRow>[] = locales.map((locale) => ({
    field: `value_${locale.code}`,
    headerName: locale.label || locale.code,
    sortable: false,
    cellRenderer: (row: TranslationRow) => {
      const text = valueFor(row, locale.code);
      if (!text) {
        return (
          <Typography variant="caption" color="text.disabled">
            — not translated
          </Typography>
        );
      }
      return (
        <Typography variant="body2" noWrap title={text}>
          {text}
        </Typography>
      );
    },
  }));

  return [
    {
      field: 'key',
      headerName: 'Key',
      sortable: true,
      cellRenderer: (row: TranslationRow) => (
        <Stack spacing={0.25}>
          <Typography variant="body2" fontWeight={700} noWrap title={row.key}>
            {row.key}
          </Typography>
          {row.description && (
            <Typography variant="caption" color="text.secondary" noWrap title={row.description}>
              {row.description}
            </Typography>
          )}
        </Stack>
      ),
    },
    {
      field: 'surface',
      headerName: 'Portal',
      sortable: true,
      cellRenderer: (row: TranslationRow) => (row.surface ? <Chip size="small" label={row.surface} /> : '—'),
    },
    {
      field: 'page',
      headerName: 'Page',
      sortable: true,
      cellRenderer: (row: TranslationRow) => (row.page ? <Chip size="small" variant="outlined" label={row.page} /> : '—'),
    },
    ...localeColumns,
    {
      field: 'updated_at',
      headerName: 'Updated',
      sortable: true,
      valueGetter: (row) => (row.updated_at ? formatDateTime(row.updated_at) : '—'),
    },
  ];
}
