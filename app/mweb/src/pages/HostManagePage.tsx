import { Link as RouterLink } from 'react-router-dom';
import { gql, useQuery } from '@apollo/client';
import { Box, Stack, Typography } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AddIcon from '@mui/icons-material/Add';
import InsightsIcon from '@mui/icons-material/Insights';
import { DuncitButton } from '@duncit/buttons';
import HostDraftsCard from './HostDraftsCard';
import HostPodActionsBridge from './host-manage-page/HostPodActionsBridge';
import HostPodSections from './host-manage-page/HostPodSections';
import HostShareCard from './host-manage-page/HostShareCard';
import HostApplyBanner from './host-apply-page/HostApplyBanner';
import HostCategoriesCard from './host-apply-page/HostCategoriesCard';

// Host-scoped list: unlike the public \`pods\` query this ALSO returns pods that
// are offline while awaiting/refused venue approval, which is what lets the
// page split them into Requested Pods / Your Pods / Rejected Pods — a pod the
// venue has not answered, or has refused, never silently vanishes.
// place_label is the venue name and created_at is when the slot was asked
// for; both are read only by the two request sections.
const HOST_PODS = gql`
  query MyHostedPods {
    myHostPods {
      id
      pod_title
      pod_id
      club_id
      club_slug
      pod_date_time
      pod_end_date_time
      pod_description
      pod_images_and_videos {
        url
        type
      }
      pod_amount
      pod_type
      pod_mode
      no_of_spots
      location_id
      venue_id
      zone_name
      place_label
      venue_approval_status
      is_active
      created_at
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
    skip: !userId,
    fetchPolicy: 'cache-and-network',
  });
  const pods = data?.myHostPods ?? [];
  const bootLoading = (meQ.loading && !meQ.data) || (!!userId && loading && !data);

  return (
    <Stack spacing={2.25} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <Stack direction="row" spacing={1.25} sx={{
        alignItems: "center"
      }}>
        <Box sx={{ width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'common.white', background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)' }}>
          <DashboardIcon fontSize="small" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
            Your Pods
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 600
            }}>
            Manage the pods you host
          </Typography>
        </Box>
        <DuncitButton component={RouterLink} to="/host/dashboard" variant="outlined" size="small" startIcon={<InsightsIcon />} sx={{ borderRadius: 999, fontWeight: 700 }}>
          Insights
        </DuncitButton>
        <DuncitButton component={RouterLink} to="/create-pod" variant="contained" size="small" startIcon={<AddIcon />} sx={{ borderRadius: 999, fontWeight: 700 }}>
          Create
        </DuncitButton>
      </Stack>

      {isHost && <HostCategoriesCard />}
      {isHost && <HostApplyBanner />}

      <HostDraftsCard />

      <HostPodActionsBridge>
        <HostPodSections
          pods={pods}
          loading={bootLoading}
          errorMessage={error?.message}
          onChanged={() => {
            refetch().catch(() => undefined);
          }}
        />
      </HostPodActionsBridge>

      <HostShareCard />
    </Stack>
  );
}
