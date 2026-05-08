import {
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Link as RouterLink } from 'react-router-dom';

export default function HostsVenuesCard() {
  return (
    <Card>
      <CardActionArea component={RouterLink} to="/hosts-venues">
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              <StorefrontIcon />
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                Hosts &amp; Venues
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Discover Duncit hosts &amp; venues — and start your onboarding here.
              </Typography>
            </Box>
            <ChevronRightIcon color="action" />
          </Stack>
        </CardContent>
      </CardActionArea>
      <Divider />
      <CardContent>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            component={RouterLink}
            to="/become-host"
            variant="outlined"
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
      </CardContent>
    </Card>
  );
}
