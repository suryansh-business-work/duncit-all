import { Chip, Stack, Typography } from '@mui/material';
import type { DuncitColumn } from '@duncit/table';
import { translatedFor, type LocaleRow, type TranslationGroupRow } from './queries';

/** Complete, untouched, or somewhere in between — the three states worth a colour. */
function completenessColor(translated: number, total: number): string {
  if (translated >= total) return 'success.main';
  if (translated === 0) return 'error.main';
  return 'warning.main';
}

interface CompletenessProps {
  translated: number;
  total: number;
}

/**
 * `12 / 20` for one locale on one namespace. Showing the pair rather than a
 * percentage keeps it readable on the small groups (3 keys is not "67%"), and
 * the colour is what makes a gap findable while scanning the column.
 */
function Completeness({ translated, total }: Readonly<CompletenessProps>) {
  return (
    <Typography variant="body2" fontWeight={600} color={completenessColor(translated, total)}>
      {translated} / {total}
    </Typography>
  );
}

/**
 * Level one of Translations: one row per namespace (surface + page), with a
 * column per active locale so an untranslated page is visible before drilling
 * into it.
 */
export function getTranslationGroupColumns(
  locales: ReadonlyArray<LocaleRow>,
  t: (key: string) => string,
): DuncitColumn<TranslationGroupRow>[] {
  const localeColumns: DuncitColumn<TranslationGroupRow>[] = locales.map((locale) => ({
    field: `translated_${locale.code}`,
    headerName: locale.label || locale.code,
    sortable: false,
    cellRenderer: (row: TranslationGroupRow) => (
      <Completeness translated={translatedFor(row, locale.code)} total={row.key_count} />
    ),
  }));

  return [
    {
      field: 'surface',
      headerName: t('admin.roles.portal'),
      sortable: true,
      cellRenderer: (row: TranslationGroupRow) =>
        row.surface ? <Chip size="small" label={row.surface} /> : '—',
    },
    {
      field: 'page',
      headerName: t('admin.activity.page'),
      sortable: true,
      cellRenderer: (row: TranslationGroupRow) => (
        <Stack spacing={0.25}>
          <Typography variant="body2" fontWeight={700}>
            {row.page || '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.id}
          </Typography>
        </Stack>
      ),
    },
    {
      field: 'key_count',
      headerName: t('admin.localization.colKeys'),
      sortable: true,
    },
    ...localeColumns,
  ];
}
