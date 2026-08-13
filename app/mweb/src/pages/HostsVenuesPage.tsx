import { useState, type ReactNode } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { DuncitTabs, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { followActionFor, followStatusFrom } from '@duncit/utils';
import HostList from './hosts-venues-page/HostList';
import VenueList from './hosts-venues-page/VenueList';
import {
  CANCEL_FOLLOW_REQUEST,
  FOLLOW_USER,
  PUBLIC_HOSTS,
  PUBLIC_VENUES,
  UNFOLLOW_USER,
} from './hosts-venues-page/queries';
import HostsVenuesIntroCard from './hosts-venues-page/HostsVenuesIntroCard';
import MeetingStatusCard from './hosts-venues-page/MeetingStatusCard';

type DirectoryTab = 'HOSTS' | 'VENUES';

/** Label with its live count, so the strip is built from data rather than markup. */
const countedLabel = (text: string, count: number) => (
  <Stack direction="row" spacing={1} alignItems="center">
    <span>{text}</span>
    <Chip size="small" label={count} />
  </Stack>
);

export default function HostsVenuesPage() {
  const hostsQ = useQuery(PUBLIC_HOSTS, { fetchPolicy: 'cache-and-network' });
  const venuesQ = useQuery(PUBLIC_VENUES, { fetchPolicy: 'cache-and-network' });
  const [followUser] = useMutation(FOLLOW_USER);
  const [unfollowUser] = useMutation(UNFOLLOW_USER);
  const [cancelRequest] = useMutation(CANCEL_FOLLOW_REQUEST);
  const [pendingFollow, setPendingFollow] = useState<string | null>(null);

  const hosts: any[] = hostsQ.data?.publicHosts ?? [];
  const venues: any[] = venuesQ.data?.publicVenues ?? [];
  const me = hostsQ.data?.me;
  const followingIds = new Set<string>((me?.following_user_ids ?? []) as string[]);
  // A host with a private profile sits in neither set until they answer — the
  // button must say Requested there, not fall back to Follow.
  const requestedIds = new Set<string>((me?.requested_user_ids ?? []) as string[]);
  const statusFor = (id: string) => followStatusFrom(followingIds, requestedIds, id);

  const directoryTabs: DuncitTabItem<DirectoryTab>[] = [
    { value: 'HOSTS', label: countedLabel('Hosts', hosts.length) },
    { value: 'VENUES', label: countedLabel('Venues', venues.length) },
  ];
  const tabs = useTabParam<DirectoryTab>({ items: directoryTabs, fallback: 'HOSTS' });
  const tab = tabs.value;

  const toggleFollow = async (targetUserId: string) => {
    if (!targetUserId || targetUserId === me?.user_id) return;
    setPendingFollow(targetUserId);
    try {
      const mutations = {
        FOLLOW: followUser,
        UNFOLLOW: unfollowUser,
        CANCEL_REQUEST: cancelRequest,
      };
      await mutations[followActionFor(statusFor(targetUserId))]({
        variables: { user_id: targetUserId },
      });
      await hostsQ.refetch();
    } finally {
      setPendingFollow(null);
    }
  };

  let content: ReactNode;
  if (tab === 'HOSTS') {
    if (hostsQ.loading && !hostsQ.data) {
      content = (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      );
    } else if (hostsQ.error) {
      content = <Alert severity="error">{hostsQ.error.message}</Alert>;
    } else {
      content = (
        <HostList
          hosts={hosts}
          meId={me?.user_id}
          statusFor={statusFor}
          pendingUserId={pendingFollow}
          onToggleFollow={toggleFollow}
        />
      );
    }
  } else if (venuesQ.loading && !venuesQ.data) {
    content = (
      <Stack alignItems="center" sx={{ py: 6 }}>
        <CircularProgress />
      </Stack>
    );
  } else if (venuesQ.error) {
    content = <Alert severity="error">{venuesQ.error.message}</Alert>;
  } else {
    content = (
      <VenueList
        venues={venues}
        meId={me?.user_id}
        statusFor={statusFor}
        pendingUserId={pendingFollow}
        onToggleFollow={toggleFollow}
      />
    );
  }

  return (
    <Stack spacing={2.25} sx={{ maxWidth: 960, mx: 'auto', width: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box sx={{ width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'primary.contrastText', background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)' }}>
          <StorefrontIcon fontSize="small" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
            Hosts &amp; Venues
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            Meet trusted people and spaces powering pods
          </Typography>
        </Box>
      </Stack>

      <HostsVenuesIntroCard />

      <MeetingStatusCard kind="HOST" />
      <MeetingStatusCard kind="VENUE" />

      <DuncitTabs
        {...tabs}
        textColor="primary"
        TabIndicatorProps={{ sx: { display: 'none' } }}
        sx={{ p: 0.5, borderRadius: 999, bgcolor: 'action.hover', border: 1, borderColor: 'divider', '& .MuiTab-root': { minHeight: 42, borderRadius: 999, fontWeight: 700 }, '& .Mui-selected': { bgcolor: 'background.paper', boxShadow: '0 10px 24px rgba(15,23,42,0.12)' } }}
      />

      {content}
    </Stack>
  );
}
