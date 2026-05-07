import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import ResponsiveDialog from '../../components/ResponsiveDialog';
import FilterBar from './FilterBar';
import PodSearchResults from './PodSearchResults';
import { POD_SEARCH } from '../../components/app-header/queries';
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
    locationId,
  } = props;

  const navigate = useNavigate();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = props.open ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (props.onOpenChange) props.onOpenChange(next);
    else setInternalOpen(next);
  };
  const [search, setSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 120);
    return () => window.clearTimeout(focusTimer);
  }, [open]);

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

  const trimmed = search.trim();
  const { data: podsData, loading: podsLoading } = useQuery(POD_SEARCH, {
    variables: {
      filter: {
        search: trimmed || undefined,
        location_id: locationId || undefined,
      },
    },
    skip: !open || trimmed.length < 1,
    fetchPolicy: 'cache-and-network',
  });

  const podResults: any[] = useMemo(() => podsData?.pods ?? [], [podsData]);

  return (
    <>
      <Tooltip title="Search & filters">
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
        title="Search & Filters"
        sheetMaxHeight="82dvh"
        actions={
          <>
            <Button size="small" startIcon={<RestartAltIcon />} onClick={handleReset} disabled={activeCount === 0}>
              Reset
            </Button>
            <Button size="small" variant="contained" onClick={() => setOpen(false)}>
              Done
            </Button>
          </>
        }
      >
        <Box>
          <Box sx={{ position: 'sticky', top: 0, zIndex: 1, bgcolor: 'background.paper', pb: 1.25 }}>
            <TextField
              inputRef={searchInputRef}
              fullWidth
              size="small"
              placeholder="Search pods..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            {trimmed.length > 0 && (
              <PodSearchResults
                loading={podsLoading}
                pods={podResults}
                onSelect={(podId) => {
                  setOpen(false);
                  navigate(`/pods/${podId}`);
                }}
              />
            )}
          </Box>

          {trimmed.length > 0 && <Divider sx={{ mt: 0.25, mb: 1.25 }} />}
          <FilterBar {...props} />
        </Box>
      </ResponsiveDialog>
    </>
  );
}
