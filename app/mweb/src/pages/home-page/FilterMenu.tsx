import { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  IconButton,
  Tooltip,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ResponsiveDialog from '../../components/ResponsiveDialog';
import FilterBar from './FilterBar';
import type { DateFilter, PriceFilter, SortBy } from './queries';

interface Props {
  categoryChips: any[];
  categoryId: string;
  setCategoryId: (v: string) => void;
  priceFilter: PriceFilter;
  setPriceFilter: (v: PriceFilter) => void;
  dateFilter: DateFilter;
  setDateFilter: (v: DateFilter) => void;
  sortBy: SortBy;
  setSortBy: (v: SortBy) => void;
  locationId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Disabled when there are no clubs/pods to filter. */
  disabled?: boolean;
}

const DEFAULT_SORT: SortBy = 'DATE_ASC';

export default function FilterMenu(props: Readonly<Props>) {
  const {
    categoryId,
    setCategoryId,
    priceFilter,
    setPriceFilter,
    dateFilter,
    setDateFilter,
    sortBy,
    setSortBy,
  } = props;

  const [internalOpen, setInternalOpen] = useState(false);
  const open = props.open ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (props.onOpenChange) props.onOpenChange(next);
    else setInternalOpen(next);
  };

  const activeCount =
    (categoryId ? 1 : 0) +
    (priceFilter !== 'ALL' ? 1 : 0) +
    (dateFilter !== 'ALL' ? 1 : 0) +
    (sortBy !== DEFAULT_SORT ? 1 : 0);

  const handleReset = () => {
    setCategoryId('');
    setPriceFilter('ALL');
    setDateFilter('ALL');
    setSortBy(DEFAULT_SORT);
  };

  return (
    <>
      <Tooltip title={props.disabled ? '' : 'Filters'}>
        <span>
        <IconButton
          onClick={() => setOpen(true)}
          disabled={props.disabled}
          aria-label={`Open filters${activeCount ? ` (${activeCount} active)` : ''}`}
          sx={{
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            minWidth: 44,
            minHeight: 44,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Badge badgeContent={activeCount} color="primary" overlap="circular">
            <FilterListIcon />
          </Badge>
        </IconButton>
        </span>
      </Tooltip>

      <ResponsiveDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Filters"
        sheetMaxHeight="78dvh"
        actions={
          <>
            <Button
              size="small"
              startIcon={<RestartAltIcon />}
              onClick={handleReset}
              disabled={activeCount === 0}
            >
              Reset
            </Button>
            <Button size="small" variant="contained" onClick={() => setOpen(false)}>
              Done
            </Button>
          </>
        }
      >
        <Box>
          <FilterBar {...props} />
        </Box>
      </ResponsiveDialog>
    </>
  );
}
