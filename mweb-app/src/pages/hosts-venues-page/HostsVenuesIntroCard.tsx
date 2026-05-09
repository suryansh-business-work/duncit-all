import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';

export default function HostsVenuesIntroCard() {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <Stack direction="row" spacing={1.5} sx={{ flex: 1 }} alignItems="center">
            <VerifiedUserIcon color="success" />
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                Want to host or list a space?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Become a Duncit Host or register your venue — onboarding is just a few steps.
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button
              component={RouterLink}
              to="/become-host"
              variant="contained"
              size="small"
              startIcon={<GroupAddIcon />}
            >
              Become a Host
            </Button>
            <Button
              component={RouterLink}
              to="/register-venue"
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
