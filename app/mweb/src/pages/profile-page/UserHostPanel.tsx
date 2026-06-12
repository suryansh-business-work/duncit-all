import { gql, useQuery } from '@apollo/client';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

const MY_HOST = gql`
  query ProfileMyHost {
    myHost {
      id
      user_id
      status
      step_completed
      reviewer_notes
      submitted_at
      approved_at
    }
    me {
      user_id
      roles
    }
  }
`;

const HOST_PODS = gql`
  query ProfileHostPods($host_user_id: ID!) {
    pods(filter: { host_user_id: $host_user_id }) {
      id
      pod_id
      club_slug
      pod_title
      pod_date_time
      pod_images_and_videos {
        url
        type
      }
    }
  }
`;

export default function UserHostPanel() {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(MY_HOST, { fetchPolicy: 'cache-and-network' });
  const host = data?.myHost;
  const myUserId: string | undefined = data?.me?.user_id || host?.user_id;
  const isHost = (data?.me?.roles ?? []).includes('HOST');
  const isApproved = host?.status === 'APPROVED';
  const completed = Math.min(host?.step_completed ?? 0, 4);
  const labels = ['Profile', 'Docs', 'Skills', 'Submit'];

  const podsQuery = useQuery(HOST_PODS, {
    variables: { host_user_id: myUserId },
    skip: !isApproved || !myUserId,
    fetchPolicy: 'cache-and-network',
  });
  const pods = podsQuery.data?.pods ?? [];

  if (loading && !data) return <CircularProgress size={22} />;
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (!host) {
    return (
      <Stack spacing={1.5}>
        <Typography variant="body2" color="text.secondary">
          {isHost
            ? "You're a host. Complete your host profile to add payout and verification details."
            : 'You have not started a host profile yet.'}
        </Typography>
        <Button component={RouterLink} to="/become-host" variant="outlined" size="small">
          {isHost ? 'Complete host profile' : 'Become a Host'}
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Box sx={{ width: 38, height: 38, borderRadius: 3, bgcolor: 'rgba(255,193,7,0.16)', color: 'warning.main', display: 'grid', placeItems: 'center' }}>
          <WorkspacePremiumIcon fontSize="small" />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 950 }}>Host application</Typography>
          <Typography variant="caption" color="text.secondary">
            {isApproved ? 'Approved host profile' : `Step ${completed} of 4 completed`}
          </Typography>
        </Box>
        <Chip size="small" label={host.status} color={isApproved ? 'success' : 'warning'} sx={{ fontWeight: 900 }} />
      </Stack>
      <Stack direction="row" spacing={0.75} alignItems="center">
        {labels.map((label, index) => {
          const done = index < completed || isApproved;
          return (
            <Box key={label} sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ height: 4, borderRadius: 99, bgcolor: done ? 'primary.main' : 'divider', mb: 0.6 }} />
              <Typography variant="caption" color={done ? 'primary.main' : 'text.secondary'} sx={{ fontSize: 10, fontWeight: 900 }} noWrap>
                {label}
              </Typography>
            </Box>
          );
        })}
      </Stack>
      {(host.approved_at || host.submitted_at) && (
        <Typography variant="caption" color="text.secondary">
          {host.approved_at ? `Approved ${new Date(host.approved_at).toLocaleDateString()}` : `Submitted ${new Date(host.submitted_at).toLocaleDateString()}`}
        </Typography>
      )}
      {host.reviewer_notes && <Alert severity="info">{host.reviewer_notes}</Alert>}
      <Button
        component={RouterLink}
        to="/become-host"
        variant="contained"
        size="large"
        sx={{ borderRadius: 999, fontWeight: 950 }}
      >
        {isApproved ? 'Update host profile' : `Resume - step ${Math.min(completed + 1, 4)} of 4`}
      </Button>

      {isApproved && (
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
            <Typography variant="subtitle2">Your Pods</Typography>
            <Chip size="small" label={pods.length} />
          </Stack>
          {podsQuery.loading && !podsQuery.data ? (
            <CircularProgress size={20} sx={{ mt: 1 }} />
          ) : pods.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              No pods yet.
            </Typography>
          ) : (
            <List dense disablePadding sx={{ mt: 0.5 }}>
              {pods.map((p: any) => {
                const cover =
                  (p.pod_images_and_videos ?? []).find((m: any) => m?.type !== 'VIDEO')?.url ||
                  p.pod_images_and_videos?.[0]?.url;
                return (
                  <ListItemButton
                    key={p.id}
                    onClick={() =>
                      p.club_slug && p.pod_id
                        ? navigate(`/club/${p.club_slug}/pod/${p.pod_id}`)
                        : null
                    }
                  >
                    <ListItemAvatar>
                      <Avatar src={cover || undefined} variant="rounded">
                        <EventIcon fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={p.pod_title}
                      secondary={
                        p.pod_date_time ? new Date(p.pod_date_time).toLocaleString() : undefined
                      }
                    />
                  </ListItemButton>
                );
              })}
            </List>
          )}
        </Box>
      )}
    </Stack>
  );
}
