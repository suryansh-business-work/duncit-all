import { gql, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlaceIcon from '@mui/icons-material/Place';

const PUBLIC_PROFILE = gql`
  query PublicProfile($user_id: ID!) {
    publicUserProfile(user_id: $user_id) {
      user_id
      full_name
      first_name
      last_name
      profile_photo
      bio
      city
      zone
    }
  }
`;

export default function PublicProfilePage() {
  const { userId = '' } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(PUBLIC_PROFILE, {
    variables: { user_id: userId },
    fetchPolicy: 'cache-and-network',
  });

  if (loading && !data) {
    return (
      <Stack spacing={2} sx={{ pt: 2 }}>
        <Skeleton variant="circular" width={96} height={96} />
        <Skeleton width="60%" height={32} />
        <Skeleton width="40%" />
      </Stack>
    );
  }

  if (error) return <Alert severity="error">{error.message}</Alert>;
  const u = data?.publicUserProfile;
  if (!u) return <Alert severity="warning">User not found.</Alert>;

  return (
    <Stack spacing={3} sx={{ pt: 1 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton onClick={() => navigate(-1)} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight={700}>
          Profile
        </Typography>
      </Stack>

      <Stack alignItems="center" spacing={1.5}>
        <Avatar
          src={u.profile_photo || undefined}
          sx={{ width: 96, height: 96, fontSize: 36 }}
        >
          {u.full_name?.[0]?.toUpperCase() ?? '?'}
        </Avatar>
        <Typography variant="h5" fontWeight={700}>
          {u.full_name || 'Duncit user'}
        </Typography>
        {(u.city || u.zone) && (
          <Stack direction="row" spacing={0.5} alignItems="center" color="text.secondary">
            <PlaceIcon fontSize="small" />
            <Typography variant="body2">
              {[u.zone, u.city].filter(Boolean).join(', ')}
            </Typography>
          </Stack>
        )}
      </Stack>

      {u.bio && (
        <Box sx={{ px: 1 }}>
          <Typography variant="overline" color="text.secondary">
            About
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {u.bio}
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
