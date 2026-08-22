import { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Tooltip,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import ResponsiveDialog from '../../components/ResponsiveDialog';
import { useTranslation } from '../../i18n/useTranslation';
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
  /** Forwarded to FilterBar — off on the full pod lists, whose order is fixed. */
  showSort?: boolean;
}

const DEFAULT_SORT: SortBy = 'DATE_ASC';

export default function FilterMenu(props: Readonly<Props>) {
  const { t } = useTranslation();
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
    (priceFilter === 'ALL' ? 0 : 1) +
    (dateFilter === 'ALL' ? 0 : 1) +
    (sortBy === DEFAULT_SORT ? 0 : 1);

  const handleReset = () => {
    setCategoryId('');
    setPriceFilter('ALL');
    setDateFilter('ALL');
    setSortBy(DEFAULT_SORT);
  };

  const activeCountSuffix = activeCount ? ` (${activeCount} active)` : '';

  return (
    <>
      <Tooltip title={props.disabled ? '' : t('mweb.home.vibeFilter')}>
        <span>
        {/* The mock's "Filter" pill — icon + label, active-count badge. */}
        <Button
          onClick={() => setOpen(true)}
          disabled={props.disabled}
          aria-label={`Open filters${activeCountSuffix}`}
          startIcon={
            <Badge badgeContent={activeCount} color="primary" overlap="circular">
              <FilterListIcon sx={{ fontSize: 18 }} />
            </Badge>
          }
          sx={{
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            color: 'text.primary',
            minHeight: 40,
            px: 1.5,
            fontWeight: 600,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          {t('mweb.home.vibeFilter')}
        </Button>
        </span>
      </Tooltip>

      <ResponsiveDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('mweb.common.filters')}
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
