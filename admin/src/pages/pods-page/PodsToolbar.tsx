import { Box, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EventIcon from '@mui/icons-material/Event';

interface Props {
  clubs: any[];
  clubFilter: string;
  setClubFilter: (id: string) => void;
  search: string;
  setSearch: (v: string) => void;
  onCreate: () => void;
}

export default function PodsToolbar({
  clubs,
  clubFilter,
  setClubFilter,
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
          <EventIcon color="primary" />
          <Typography variant="h5">Pods</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Events organised inside a club. Hosts are attendees by default.
        </Typography>
      </Box>
      <Stack direction="row" spacing={2}>
        <TextField
          size="small"
          select
          label="Club"
          value={clubFilter}
          onChange={(e) => setClubFilter(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="">All clubs</MenuItem>
          {clubs.map((c: any) => (
            <MenuItem key={c.id} value={c.id}>
              {c.club_name}
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
          New Pod
        </Button>
      </Stack>
    </Stack>
  );
}
