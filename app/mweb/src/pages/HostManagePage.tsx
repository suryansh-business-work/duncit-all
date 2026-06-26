import { Link as RouterLink } from 'react-router-dom';
import { gql, useQuery } from '@apollo/client';
import { Box, Button, Stack, Typography } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AddIcon from '@mui/icons-material/Add';
import HostDraftsCard from './HostDraftsCard';
import HostPodsCard from './host-manage-page/HostPodsCard';
import HostShareCard from './host-manage-page/HostShareCard';
import HostApplyBanner from './host-apply-page/HostApplyBanner';
import HostCategoriesCard from './host-apply-page/HostCategoriesCard';

const HOST_PODS = gql`
  query MyHostedPods($host_user_id: ID!) {
    pods(filter: { host_user_id: $host_user_id, is_active: true }) {
      id
      pod_title
      pod_id
      club_slug
      pod_date_time
      pod_description
      pod_images_and_videos {
        url
        type
      }
      pod_amount
      pod_type
      no_of_spots
      location_id
      venue_id
      zone_name
    }
  }
`;

const ME_QUERY = gql`
  query MeForHostManage {
    me {
      user_id
      full_name
      roles
    }
  }
`;

/** Your Pods — the host's hosted-pods list + drafts (the dashboard overview now
 * lives on its own page). B2-#5. */
export default function HostManagePage() {
  const meQ = useQuery(ME_QUERY, { fetchPolicy: 'cache-and-network' });
  const userId = meQ.data?.me?.user_id;
  const isHost = (meQ.data?.me?.roles ?? []).includes('HOST');
  const { data, loading, error, refetch } = useQuery(HOST_PODS, {
    variables: { host_user_id: userId },
    skip: !userId,
    fetchPolicy: 'cache-and-network',
  });
  const pods = data?.pods ?? [];
  const bootLoading = (meQ.loading && !meQ.data) || (!!userId && loading && !data);

  return (
    <Stack spacing={2.25} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1.25}>
        <Box sx={{ width: 38, height: 38, borderRadius: 3, display: 'grid', placeItems: 'center', color: 'common.white', background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)' }}>
          <DashboardIcon fontSize="small" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1 }}>
            Your Pods
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
            Manage the pods you host
          </Typography>
        </Box>
        <Button component={RouterLink} to="/create-pod" variant="contained" size="small" startIcon={<AddIcon />} sx={{ borderRadius: 999, fontWeight: 950 }}>
          Create
        </Button>
      </Stack>

      {isHost && <HostCategoriesCard />}
      {isHost && <HostApplyBanner />}

      <HostDraftsCard />

      <HostPodsCard
        pods={pods}
        loading={bootLoading}
        errorMessage={error?.message}
        onChanged={() => {
          refetch().catch(() => undefined);
        }}
      />

      <HostShareCard />
    </Stack>
  );
}
