import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import GroupsIcon from '@mui/icons-material/Groups';

interface Props {
  search: string;
  setSearch: (v: string) => void;
  onCreate: () => void;
}

export default function ClubsToolbar({ search, setSearch, onCreate }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
    >
      <Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <GroupsIcon color="primary" />
          <Typography variant="h5">Clubs</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Manage clubs. Pods are organised inside a club.
        </Typography>
      </Box>
      <Stack direction="row" spacing={2}>
        <TextField
          size="small"
          placeholder="Search name or ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}>
          New Club
        </Button>
      </Stack>
    </Stack>
  );
}
