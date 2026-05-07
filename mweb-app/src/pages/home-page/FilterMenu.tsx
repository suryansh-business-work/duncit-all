import { useState } from 'react';
import { Badge, Button, IconButton, Tooltip } from '@mui/material';
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
}

const DEFAULT_SORT: SortBy = 'DATE_ASC';

export default function FilterMenu(props: Props) {
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

  const [open, setOpen] = useState(false);

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
      <Tooltip title="Filters & sort">
        <IconButton
          onClick={() => setOpen(true)}
          aria-label="open filters"
          sx={{
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Badge badgeContent={activeCount} color="primary" overlap="circular">
            <FilterListIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <ResponsiveDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Filters & Sort"
        actions={
          <>
            <Button
              startIcon={<RestartAltIcon />}
              onClick={handleReset}
              disabled={activeCount === 0}
            >
              Reset
            </Button>
            <Button variant="contained" onClick={() => setOpen(false)}>
              Done
            </Button>
          </>
        }
      >
        <FilterBar {...props} />
      </ResponsiveDialog>
    </>
  );
}
