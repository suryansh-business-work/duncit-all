import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, ClickAwayListener, InputAdornment, Paper, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PodSearchResults from './PodSearchResults';
import { POD_SEARCH } from '../../components/app-header/queries';

interface Props {
  locationId?: string;
}

export default function HomeSearch({ locationId }: Props) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const trimmed = search.trim();

  const { data, loading } = useQuery(POD_SEARCH, {
    variables: {
      filter: { search: trimmed || undefined, location_id: locationId || undefined },
    },
    skip: trimmed.length < 1,
    fetchPolicy: 'cache-and-network',
  });

  const pods: any[] = useMemo(() => data?.pods ?? [], [data]);
  const showResults = open && trimmed.length > 0;

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: 'relative', width: '100%' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search pods…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
          inputProps={{
            'aria-label': 'Search pods',
            enterKeyHint: 'search',
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              bgcolor: 'background.paper',
              minHeight: 44,
            },
          }}
        />
        {showResults && (
          <Paper
            elevation={6}
            sx={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              zIndex: 5,
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <PodSearchResults
              loading={loading}
              pods={pods}
              onSelect={(podId) => {
                setOpen(false);
                const pod = pods.find((p: any) => p.id === podId);
                if (pod?.club_slug && pod.pod_id) {
                  navigate(`/club/${pod.club_slug}/pod/${pod.pod_id}`);
                }
              }}
            />
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
}
