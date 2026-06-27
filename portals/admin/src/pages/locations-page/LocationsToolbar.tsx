import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LocationOnIcon from '@mui/icons-material/LocationOn';

interface Props {
  search: string;
  setSearch: (v: string) => void;
  onCreate: () => void;
}

export default function LocationsToolbar({ search, setSearch, onCreate }: Readonly<Props>) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
    >
      <Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <LocationOnIcon color="primary" />
          <Typography variant="h5">Locations</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Country, state, city and locality/PIN coverage served by the platform.
        </Typography>
      </Box>
      <Stack direction="row" spacing={2}>
        <TextField
          size="small"
          placeholder="Search state, city, area or PIN"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}>
          New Location
        </Button>
      </Stack>
    </Stack>
  );
}
