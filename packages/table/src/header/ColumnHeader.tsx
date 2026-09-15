import { useState } from 'react';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TableSortLabel from '@mui/material/TableSortLabel';
import Tooltip from '@mui/material/Tooltip';
import { DuncitIconButton } from '@duncit/buttons';
import type { CustomHeaderProps } from 'ag-grid-react';
import { columnHeader, isColumnFilterable, isColumnSortable, sortingOrderOf } from '../columnTypes';
import { useTranslation } from '../i18n';
import type { DuncitColumn, TableSortDir } from '../types';
import { ColumnFilterPopover } from './ColumnFilterPopover';
import { useTableHeaderState } from './headerState';

/** What `buildColDefs` hands every header through `headerComponentParams`. */
export interface ColumnHeaderParams<T> {
  duncitColumn: DuncitColumn<T>;
}

const LABEL_SX = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;

/**
 * MUI keeps an unsorted column's arrow in the layout at opacity 0, which in a
 * narrow column costs the label a third of its room. The arrow takes space only
 * once it means something: the column is sorted, or the pointer / focus is on it.
 */
const SORT_LABEL_SX = {
  flex: 1,
  minWidth: 0,
  fontWeight: 'inherit',
  '&:not(.Mui-active) .MuiTableSortLabel-icon': { display: 'none' },
  '&:not(.Mui-active):hover .MuiTableSortLabel-icon, &:not(.Mui-active):focus-visible .MuiTableSortLabel-icon': {
    display: 'inline-block',
  },
} as const;

/** A compact filter button, so the header label keeps its width. */
const FILTER_BUTTON_SX = { p: 0.25, flexShrink: 0 } as const;

interface HeaderLabelProps {
  label: string;
  sort: TableSortDir | null;
  /** The direction the arrow previews before the column is sorted. */
  firstDir: TableSortDir;
  onSort: (() => void) | null;
}

/** The header text — a sort toggle when the column sorts, plain text when it cannot. */
function HeaderLabel({ label, sort, firstDir, onSort }: Readonly<HeaderLabelProps>) {
  if (!onSort) {
    return (
      <Box component="span" sx={{ ...LABEL_SX, flex: 1, minWidth: 0 }}>
        {label}
      </Box>
    );
  }
  return (
    <TableSortLabel
      active={sort !== null}
      direction={sort ?? firstDir}
      onClick={onSort}
      sx={SORT_LABEL_SX}
    >
      <Box component="span" sx={LABEL_SX}>
        {label}
      </Box>
    </TableSortLabel>
  );
}

/**
 * Every column's header: its sort, and its own filter.
 *
 * Sorting goes through AG Grid's `progressSort`, so a click walks the column
 * type's `sortingOrder` and lands in the table's one `onSortChanged` path — the
 * same one a keyboard Enter on the header cell takes. The arrow shows the
 * table's applied sort, never the grid's, so it cannot disagree with the query.
 */
export function ColumnHeader<T>(props: Readonly<CustomHeaderProps<T> & ColumnHeaderParams<T>>) {
  const { duncitColumn: column, progressSort } = props;
  const { t } = useTranslation();
  const { sortBy, sortDir, filters } = useTableHeaderState();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const label = columnHeader(column, t);
  const sortable = isColumnSortable(column);
  const filterable = isColumnFilterable(column);
  const filtered = filters.some((filter) => filter.field === column.field);
  const filterTitle = t('shell.table.filterColumn', { vars: { label } });
  const firstDir = sortingOrderOf(column)[0] ?? 'asc';
  const sort = sortBy === column.field ? sortDir : null;
  const onSort = sortable ? () => progressSort(false) : null;

  return (
    <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center', width: '100%', minWidth: 0 }}>
      <HeaderLabel label={label} sort={sort} firstDir={firstDir} onSort={onSort} />
      {filterable ? (
        <Tooltip title={filterTitle}>
          <DuncitIconButton
            size="small"
            color={filtered ? 'primary' : 'default'}
            sx={FILTER_BUTTON_SX}
            aria-haspopup="dialog"
            aria-expanded={Boolean(anchor)}
            data-testid={`table-filter-${column.field}`}
            onClick={(event) => setAnchor(event.currentTarget)}
          >
            {filtered ? <FilterAltIcon fontSize="small" /> : <FilterAltOutlinedIcon fontSize="small" />}
          </DuncitIconButton>
        </Tooltip>
      ) : null}
      {anchor ? (
        <ColumnFilterPopover
          column={column}
          label={label}
          anchorEl={anchor}
          onClose={() => setAnchor(null)}
        />
      ) : null}
    </Stack>
  );
}
