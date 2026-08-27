import { useState, type ReactNode } from 'react';
import ClearIcon from '@mui/icons-material/Clear';
import DensityMediumIcon from '@mui/icons-material/DensityMedium';
import DensitySmallIcon from '@mui/icons-material/DensitySmall';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../i18n';
import type { TableDensity } from '../persistence';
import type { DuncitColumn, TableFilterValue } from '../types';
import { ColumnMenu } from './ColumnMenu';
import { FilterPopover } from './FilterPopover';
import { filterChipLabel } from './filterState';

export interface DuncitTableToolbarProps<T> {
  columns: ReadonlyArray<DuncitColumn<T>>;
  searchInput: string;
  setSearchInput: (value: string) => void;
  searchPlaceholder?: string;
  filters: TableFilterValue[];
  setFilters: (filters: TableFilterValue[]) => void;
  toolbarActions?: ReactNode;
  hiddenOverrides: Record<string, boolean>;
  toggleColumn: (field: string, currentlyHidden: boolean) => void;
  resetColumns: () => void;
  density: TableDensity;
  toggleDensity: () => void;
  onExportCsv: () => void;
  onRefresh: () => void;
}

/** Search + filters + chips on the left; actions slot, columns, density, CSV, refresh on the right. */
export function DuncitTableToolbar<T>(props: Readonly<DuncitTableToolbarProps<T>>) {
  const {
    columns,
    searchInput,
    setSearchInput,
    searchPlaceholder,
    filters,
    setFilters,
    toolbarActions,
    hiddenOverrides,
    toggleColumn,
    resetColumns,
    density,
    toggleDensity,
    onExportCsv,
    onRefresh,
  } = props;
  const { t } = useTranslation();
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const [columnAnchor, setColumnAnchor] = useState<HTMLElement | null>(null);
  const hasFilterableColumns = columns.some((column) => column.filter);
  const isCompact = density === 'compact';
  const densityTitle = isCompact ? t('shell.table.densityStandard') : t('shell.table.densityCompact');
  const placeholder = searchPlaceholder ?? t('shell.table.search');

  const removeFilter = (field: string) => {
    setFilters(filters.filter((filter) => filter.field !== field));
  };

  const clearAdornment = (
    <InputAdornment position="end">
      <Tooltip title={t('shell.table.clearSearch')}>
        <DuncitIconButton
          size="small"
          aria-label={t('shell.table.clearSearch')}
          onClick={() => setSearchInput('')}
        >
          <ClearIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
    </InputAdornment>
  );

  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      sx={{
        alignItems: "center",
        flexWrap: "wrap"
      }}>
      <TextField
        size="small"
        placeholder={placeholder}
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: searchInput ? clearAdornment : undefined,
          },

          htmlInput: { 'aria-label': placeholder }
        }} />
      {hasFilterableColumns ? (
        <Badge badgeContent={filters.length} color="primary">
          <DuncitButton
            size="small"
            startIcon={<FilterListIcon />}
            onClick={(event) => setFilterAnchor(event.currentTarget)}
          >
            {t('shell.table.filters')}
          </DuncitButton>
        </Badge>
      ) : null}
      {filters.map((filter) => (
        <Chip
          key={filter.field}
          size="small"
          label={filterChipLabel(columns, filter, t)}
          onDelete={() => removeFilter(filter.field)}
        />
      ))}
      <Box sx={{ flexGrow: 1 }} />
      {toolbarActions}
      <Tooltip title={t('shell.table.columns')}>
        <DuncitIconButton
          size="small"
          aria-label={t('shell.table.columns')}
          onClick={(event) => setColumnAnchor(event.currentTarget)}
        >
          <ViewColumnIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
      <Tooltip title={densityTitle}>
        <DuncitIconButton size="small" aria-label={densityTitle} onClick={toggleDensity}>
          {isCompact ? <DensityMediumIcon fontSize="small" /> : <DensitySmallIcon fontSize="small" />}
        </DuncitIconButton>
      </Tooltip>
      <Tooltip title={t('shell.table.exportCsv')}>
        <DuncitIconButton size="small" aria-label={t('shell.table.exportCsv')} onClick={onExportCsv}>
          <FileDownloadIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
      <Tooltip title={t('shell.table.refresh')}>
        <DuncitIconButton size="small" aria-label={t('shell.table.refresh')} onClick={onRefresh}>
          <RefreshIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
      <FilterPopover
        open={Boolean(filterAnchor)}
        anchorEl={filterAnchor}
        onClose={() => setFilterAnchor(null)}
        columns={columns}
        filters={filters}
        setFilters={setFilters}
      />
      <ColumnMenu
        open={Boolean(columnAnchor)}
        anchorEl={columnAnchor}
        onClose={() => setColumnAnchor(null)}
        columns={columns}
        hiddenOverrides={hiddenOverrides}
        toggleColumn={toggleColumn}
        resetColumns={resetColumns}
      />
    </Stack>
  );
}
