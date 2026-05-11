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
  const isApproved = host?.status === 'APPROVED';

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
          You have not started a host profile yet.
        </Typography>
        <Button component={RouterLink} to="/become-host" variant="outlined" size="small">
          Become a Host
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="subtitle2">Host application</Typography>
        <Chip size="small" label={host.status} color={isApproved ? 'success' : 'default'} />
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Step {host.step_completed}/4
        {host.approved_at ? ` · Approved ${new Date(host.approved_at).toLocaleDateString()}` : ''}
        {!host.approved_at && host.submitted_at
          ? ` · Submitted ${new Date(host.submitted_at).toLocaleDateString()}`
          : ''}
      </Typography>
      {host.reviewer_notes && <Alert severity="info">{host.reviewer_notes}</Alert>}
      <Button
        component={RouterLink}
        to="/become-host"
        variant="outlined"
        size="small"
        sx={{ alignSelf: 'flex-start' }}
      >
        Open Host Profile
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
