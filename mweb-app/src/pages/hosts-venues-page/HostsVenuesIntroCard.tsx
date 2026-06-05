import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';

export default function HostsVenuesIntroCard() {
  return (
    <Card variant="outlined" sx={{ borderRadius: 4, bgcolor: 'rgba(255,79,115,0.10)' }}>
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <Stack direction="row" spacing={1.5} sx={{ flex: 1 }} alignItems="center">
            <Box sx={{ width: 42, height: 42, borderRadius: 3, display: 'grid', placeItems: 'center', bgcolor: 'success.main', color: 'success.contrastText' }}>
              <VerifiedUserIcon />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 950 }}>
                Want to host or list a space?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Become a Duncit Host or register your venue — onboarding is just a few steps.
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ '& .MuiButton-root': { borderRadius: 999, fontWeight: 900 } }}>
            <Button
              component={RouterLink}
              to="/survey/host"
              variant="contained"
              size="small"
              startIcon={<GroupAddIcon />}
            >
              Become a Host
            </Button>
            <Button
              component={RouterLink}
              to="/survey/venue"
              variant="outlined"
              size="small"
              startIcon={<AddBusinessIcon />}
            >
              Register Venue
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
