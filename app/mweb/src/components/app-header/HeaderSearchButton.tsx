import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Dialog,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PodSearchResults from '../../pages/home-page/PodSearchResults';
import { POD_SEARCH } from './queries';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

interface Props {
  locationId: string;
  zoneName: string;
}

/** Global header search — a search icon that opens a top sheet with the same
 * pod search used on the home page, available from every page. */
export default function HeaderSearchButton({ locationId, zoneName }: Readonly<Props>) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const trimmed = useDebouncedValue(search.trim());

  const { data, loading } = useQuery(POD_SEARCH, {
    variables: {
      filter: {
        search: trimmed || undefined,
        location_id: locationId || undefined,
        zone_name: zoneName || undefined,
        is_active: true,
      },
    },
    skip: !open || trimmed.length < 1,
    fetchPolicy: 'cache-and-network',
  });
  const pods: any[] = useMemo(() => data?.pods ?? [], [data]);

  const close = () => {
    setOpen(false);
    setSearch('');
  };

  const handleSelect = (podId: string) => {
    const pod = pods.find((p) => p.id === podId);
    close();
    if (pod?.club_slug && pod.pod_id) {
      navigate(`/club/${pod.club_slug}/pod/${pod.pod_id}`);
    }
  };

  return (
    <>
      <Tooltip title="Search pods">
        <IconButton
          aria-label="Search pods"
          onClick={() => setOpen(true)}
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <SearchIcon />
        </IconButton>
      </Tooltip>

      <Dialog
        open={open}
        onClose={close}
        fullWidth
        maxWidth="sm"
        // MUI restores focus to the opener by default, which defeats the
        // TextField's autoFocus — disable it so the input focuses on open.
        disableRestoreFocus
        sx={{ '& .MuiDialog-container': { alignItems: 'flex-start' } }}
        PaperProps={{ sx: { mt: { xs: 0, sm: 6 }, borderRadius: { xs: 0, sm: 3 } } }}
      >
        <Box sx={{ p: 1.5 }}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="Search pods…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            inputProps={{ 'aria-label': 'Search pods', enterKeyHint: 'search' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconButton aria-label="Close search" size="small" edge="start" onClick={close}>
                    <ArrowBackIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, minHeight: 48 } }}
          />
          {trimmed.length > 0 && (
            <PodSearchResults loading={loading} pods={pods} onSelect={handleSelect} />
          )}
        </Box>
      </Dialog>
    </>
  );
}
