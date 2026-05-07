import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import FilterListIcon from '@mui/icons-material/FilterList';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import ResponsiveDialog from '../../components/ResponsiveDialog';
import FilterBar from './FilterBar';
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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

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
        sheetMaxHeight="76dvh"
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
        <Box sx={{ mx: -0.5 }}>
          <Box sx={{ position: 'sticky', top: 0, zIndex: 1, bgcolor: 'background.paper', pb: 1 }}>
            <TextField
              autoFocus
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
              <Box sx={{ mt: 0.75, maxHeight: 212, overflowY: 'auto', border: 1, borderColor: 'divider', borderRadius: 2 }}>
                {podsLoading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.25 }}>
                    <CircularProgress size={18} />
                  </Box>
                )}
                {!podsLoading && podResults.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 1, textAlign: 'center' }}>
                    No pods found
                  </Typography>
                )}
                {podResults.slice(0, 6).map((p: any) => (
                  <MenuItem
                    dense
                    key={p.id}
                    onClick={() => {
                      setOpen(false);
                      navigate(`/pods/${p.id}`);
                    }}
                    sx={{ px: 1, py: 0.75 }}
                  >
                    <ListItemIcon sx={{ minWidth: 42 }}>
                      <Avatar
                        variant="rounded"
                        src={p.pod_images_and_videos?.[0]?.url}
                        sx={{ width: 34, height: 34 }}
                      >
                        <EventIcon fontSize="small" />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primaryTypographyProps={{ noWrap: true, sx: { lineHeight: 1.2, fontWeight: 700 } }}
                      secondaryTypographyProps={{ noWrap: true, sx: { lineHeight: 1.15 } }}
                      primary={p.pod_title}
                      secondary={p.pod_date_time ? new Date(p.pod_date_time).toLocaleString() : p.pod_id}
                    />
                  </MenuItem>
                ))}
              </Box>
            )}
          </Box>

          {trimmed.length > 0 && <Divider sx={{ mb: 1 }} />}
          <FilterBar {...props} />
        </Box>
      </ResponsiveDialog>
    </>
  );
}
