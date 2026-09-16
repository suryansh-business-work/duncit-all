import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../i18n';
import type { DuncitColumn, TableFilterValue } from '../types';
import { filterChipLabel } from './filterState';

interface ActiveFilterChipsProps<T> {
  columns: ReadonlyArray<DuncitColumn<T>>;
  filters: TableFilterValue[];
  setFilters: (filters: TableFilterValue[]) => void;
  loading: boolean;
}

/**
 * Every applied column filter as a removable chip, plus Clear all. Filters are
 * set from each column's header; this is where all of them are seen at once.
 */
export function ActiveFilterChips<T>(props: Readonly<ActiveFilterChipsProps<T>>) {
  const { columns, filters, setFilters, loading } = props;
  const { t } = useTranslation();
  if (filters.length === 0) return null;
  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      role="group"
      aria-label={t('shell.table.filters')}
      sx={{ alignItems: 'center', flexWrap: 'wrap' }}
    >
      {filters.map((filter) => (
        <Chip
          key={filter.field}
          size="small"
          label={filterChipLabel(columns, filter, t)}
          disabled={loading}
          onDelete={() => setFilters(filters.filter((other) => other.field !== filter.field))}
        />
      ))}
      <DuncitButton
        size="small"
        disabled={loading}
        data-testid="table-toolbar-clear-filters"
        onClick={() => setFilters([])}
      >
        {t('shell.table.clearAll')}
      </DuncitButton>
    </Stack>
  );
}
