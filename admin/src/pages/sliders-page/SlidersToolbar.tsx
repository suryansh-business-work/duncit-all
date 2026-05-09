import {
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ViewCarouselIcon from '@mui/icons-material/ViewCarousel';
import { SCOPES } from './queries';

interface Props {
  scopeFilter: string;
  setScopeFilter: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  onCreate: () => void;
}

export default function SlidersToolbar({
  scopeFilter,
  setScopeFilter,
  search,
  setSearch,
  onCreate,
}: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
    >
      <Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <ViewCarouselIcon color="primary" />
          <Typography variant="h5">Sliders</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Hub app banners. Target Global, a specific Location, or a Zone inside a Location.
        </Typography>
      </Box>
      <Stack direction="row" spacing={2}>
        <TextField
          select
          size="small"
          label="Scope"
          value={scopeFilter}
          onChange={(e) => setScopeFilter(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All</MenuItem>
          {SCOPES.map((s) => (
            <MenuItem key={s.value} value={s.value}>
              {s.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          placeholder="Search title"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}>
          New Slider
        </Button>
      </Stack>
    </Stack>
  );
}
