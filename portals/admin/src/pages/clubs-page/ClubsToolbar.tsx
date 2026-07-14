import { Box, Stack, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';

export default function ClubsToolbar() {
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1}>
        <GroupsIcon color="primary" />
        <Typography variant="h5">Clubs</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Manage clubs. Pods are organised inside a club.
      </Typography>
    </Box>
  );
}
