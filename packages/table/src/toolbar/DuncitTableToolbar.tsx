import { useState, type ReactNode } from 'react';
import ClearIcon from '@mui/icons-material/Clear';
import DensityMediumIcon from '@mui/icons-material/DensityMedium';
import DensitySmallIcon from '@mui/icons-material/DensitySmall';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import { DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../i18n';
import type { TableDensity } from '../persistence';
import type { DuncitColumn, TableFilterValue } from '../types';
import { ActiveFilterChips } from './ActiveFilterChips';
import { ColumnMenu } from './ColumnMenu';

/**
 * The page's own toolbar buttons, switched off with the rest of the toolbar.
 *
 * `toolbarActions` is an opaque `ReactNode` — a "+ Create", an export, whatever
 * the page hands over — so there is no prop to reach down into it with. A
 * `disabled` fieldset is the platform's own answer: every control inside it goes
 * disabled AND leaves the tab order, which `pointer-events: none` would not do.
 * `display: contents` keeps those actions direct flex children of the toolbar
 * row, so the wrapper changes nothing about how they sit.
 *
 * The dim is what tells the reader they are off, since MUI paints its disabled
 * look from the prop it never received. `pointer-events` covers the one thing a
 * fieldset cannot: an action rendered as a LINK (`component={RouterLink}`) is
 * not a form control, so `disabled` passes it by.
 */
const ACTIONS_FIELDSET_SX = {
  display: 'contents',
  '&:disabled > *': { opacity: 0.6, pointerEvents: 'none' },
} as const;

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
  /** Download + GET API — `TableDataActions`, sitting just left of refresh. */
  dataActions: ReactNode;
  onRefresh: () => void;
  /** A fetch is in flight: every control here is dead until it lands. */
  loading: boolean;
}

/**
 * Search + the active-filter chips on the left; actions slot, columns, density,
 * download, GET API, refresh on the right. Filters are set from each column's
 * header — the chips are where every applied one is seen and removed.
 */
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
    dataActions,
    onRefresh,
    loading,
  } = props;
  const { t } = useTranslation();
  const [columnAnchor, setColumnAnchor] = useState<HTMLElement | null>(null);
  const isCompact = density === 'compact';
  const densityTitle = isCompact ? t('shell.table.densityStandard') : t('shell.table.densityCompact');
  const placeholder = searchPlaceholder ?? t('shell.table.search');

  const clearAdornment = (
    <InputAdornment position="end">
      <Tooltip title={t('shell.table.clearSearch')}>
        <DuncitIconButton
          size="small"
          aria-label={t('shell.table.clearSearch')}
          disabled={loading}
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
        disabled={loading}
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

          htmlInput: { 'aria-label': placeholder, 'data-testid': 'table-toolbar-search' }
        }} />
      <ActiveFilterChips columns={columns} filters={filters} setFilters={setFilters} loading={loading} />
      <Box sx={{ flexGrow: 1 }} />
      <Box component="fieldset" disabled={loading} sx={ACTIONS_FIELDSET_SX}>
        {toolbarActions}
      </Box>
      <Tooltip title={t('shell.table.columns')}>
        <DuncitIconButton
          size="small"
          aria-label={t('shell.table.columns')}
          aria-haspopup="menu"
          aria-expanded={Boolean(columnAnchor)}
          disabled={loading}
          onClick={(event) => setColumnAnchor(event.currentTarget)}
        >
          <ViewColumnIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
      <Tooltip title={densityTitle}>
        <DuncitIconButton
          size="small"
          aria-label={densityTitle}
          disabled={loading}
          onClick={toggleDensity}
        >
          {isCompact ? <DensityMediumIcon fontSize="small" /> : <DensitySmallIcon fontSize="small" />}
        </DuncitIconButton>
      </Tooltip>
      {dataActions}
      <Tooltip title={t('shell.table.refresh')}>
        <DuncitIconButton
          size="small"
          aria-label={t('shell.table.refresh')}
          disabled={loading}
          onClick={onRefresh}
        >
          <RefreshIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
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
