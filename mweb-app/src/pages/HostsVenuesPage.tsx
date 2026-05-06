import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { gql, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import HostList from './hosts-venues-page/HostList';
import VenueList from './hosts-venues-page/VenueList';

const PUBLIC_HOSTS = gql`
  query PublicHosts {
    publicHosts {
      id
      full_name
      email
      passport_photo_url
      full_address
      approved_at
    }
  }
`;

const PUBLIC_VENUES = gql`
  query PublicVenues {
    publicVenues {
      id
      venue_name
      venue_type
      capacity
      description
      cover_image_url
      city
      state
      amenities
    }
  }
`;

export default function HostsVenuesPage() {
  const [tab, setTab] = useState<'HOSTS' | 'VENUES'>('HOSTS');
  const hostsQ = useQuery(PUBLIC_HOSTS, { fetchPolicy: 'cache-and-network' });
  const venuesQ = useQuery(PUBLIC_VENUES, { fetchPolicy: 'cache-and-network' });

  const hosts: any[] = hostsQ.data?.publicHosts ?? [];
  const venues: any[] = venuesQ.data?.publicVenues ?? [];

  return (
    <Stack spacing={3} sx={{ maxWidth: 960, mx: 'auto', width: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <StorefrontIcon color="primary" />
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
          Hosts &amp; Venues
        </Typography>
      </Stack>

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
                  Become a Duncit Host or register your venue — onboarding is just a few
                  steps.
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

      <Tabs
        value={tab}
        onChange={(_e, v) => setTab(v)}
        textColor="primary"
        indicatorColor="primary"
      >
        <Tab
          value="HOSTS"
          label={
            <Stack direction="row" spacing={1} alignItems="center">
              <span>Hosts</span>
              <Chip size="small" label={hosts.length} />
            </Stack>
          }
        />
        <Tab
          value="VENUES"
          label={
            <Stack direction="row" spacing={1} alignItems="center">
              <span>Venues</span>
              <Chip size="small" label={venues.length} />
            </Stack>
          }
        />
      </Tabs>

      {tab === 'HOSTS' ? (
        hostsQ.loading && !hostsQ.data ? (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress />
          </Stack>
        ) : hostsQ.error ? (
          <Alert severity="error">{hostsQ.error.message}</Alert>
        ) : (
          <HostList hosts={hosts} />
        )
      ) : venuesQ.loading && !venuesQ.data ? (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      ) : venuesQ.error ? (
        <Alert severity="error">{venuesQ.error.message}</Alert>
      ) : (
        <VenueList venues={venues} />
      )}
    </Stack>
  );
}
