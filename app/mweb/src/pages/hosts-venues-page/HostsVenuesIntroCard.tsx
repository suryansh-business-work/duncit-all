import { Link as RouterLink } from 'react-router';
import { Box, Card, Stack, Typography } from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUserOutlined';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import { DuncitButton } from '@duncit/buttons';

/** "Want to host or list a space?" — the title and the two CTAs say it all. */
export default function HostsVenuesIntroCard() {
  return (
    <Card sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              flex: '0 0 auto',
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'action.hover',
              color: 'secondary.main',
            }}
          >
            <VerifiedUserIcon fontSize="small" />
          </Box>
          <Typography sx={{ fontSize: '1rem', fontWeight: 600 }}>
            Want to host or list a space?
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <DuncitButton
            component={RouterLink}
            to="/survey/host"
            variant="contained"
            startIcon={<GroupAddIcon />}
            sx={{ flex: 1 }}
          >
            Become a Host
          </DuncitButton>
          <DuncitButton
            component={RouterLink}
            to="/survey/venue"
            startIcon={<AddBusinessIcon />}
            sx={{ flex: 1, bgcolor: 'action.hover', color: 'text.primary', '&:hover': { bgcolor: 'action.selected' } }}
          >
            Register Venue
          </DuncitButton>
        </Stack>
      </Stack>
    </Card>
  );
}
