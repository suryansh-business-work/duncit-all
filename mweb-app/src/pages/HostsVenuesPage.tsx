import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Chip,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import HostList from './hosts-venues-page/HostList';
import VenueList from './hosts-venues-page/VenueList';
import {
  FOLLOW_USER,
  PUBLIC_HOSTS,
  PUBLIC_VENUES,
  UNFOLLOW_USER,
} from './hosts-venues-page/queries';
import HostsVenuesIntroCard from './hosts-venues-page/HostsVenuesIntroCard';

export default function HostsVenuesPage() {
  const [tab, setTab] = useState<'HOSTS' | 'VENUES'>('HOSTS');
  const hostsQ = useQuery(PUBLIC_HOSTS, { fetchPolicy: 'cache-and-network' });
  const venuesQ = useQuery(PUBLIC_VENUES, { fetchPolicy: 'cache-and-network' });
  const [followUser] = useMutation(FOLLOW_USER);
  const [unfollowUser] = useMutation(UNFOLLOW_USER);
  const [pendingFollow, setPendingFollow] = useState<string | null>(null);

  const hosts: any[] = hostsQ.data?.publicHosts ?? [];
  const venues: any[] = venuesQ.data?.publicVenues ?? [];
  const me = hostsQ.data?.me;
  const followingIds = new Set<string>((me?.following_user_ids ?? []) as string[]);

  const toggleFollow = async (targetUserId: string) => {
    if (!targetUserId || targetUserId === me?.user_id) return;
    setPendingFollow(targetUserId);
    try {
      const mutation = followingIds.has(targetUserId) ? unfollowUser : followUser;
      await mutation({ variables: { user_id: targetUserId } });
      await hostsQ.refetch();
    } finally {
      setPendingFollow(null);
    }
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 960, mx: 'auto', width: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <StorefrontIcon color="primary" />
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
          Hosts &amp; Venues
        </Typography>
      </Stack>

      <HostsVenuesIntroCard />

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
          <HostList
            hosts={hosts}
            meId={me?.user_id}
            followingIds={followingIds}
            pendingUserId={pendingFollow}
            onToggleFollow={toggleFollow}
          />
        )
      ) : venuesQ.loading && !venuesQ.data ? (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      ) : venuesQ.error ? (
        <Alert severity="error">{venuesQ.error.message}</Alert>
      ) : (
        <VenueList
          venues={venues}
          meId={me?.user_id}
          followingIds={followingIds}
          pendingUserId={pendingFollow}
          onToggleFollow={toggleFollow}
        />
      )}
    </Stack>
  );
}
