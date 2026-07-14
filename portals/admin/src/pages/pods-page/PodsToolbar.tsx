import { Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';

interface Props {
  clubs: any[];
  clubFilter: string;
  setClubFilter: (id: string) => void;
}

export default function PodsToolbar({ clubs, clubFilter, setClubFilter }: Readonly<Props>) {
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
    </Stack>
  );
}
