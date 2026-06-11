import { gql, useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PublicProfileHeader from './PublicProfileHeader';
import PublicProfileOwnerActions from './PublicProfileOwnerActions';
import PublicProfileBadges from './PublicProfileBadges';

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
    me {
      user_id
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
      <Stack spacing={2} sx={{ pt: 2, alignItems: 'center' }}>
        <Skeleton variant="circular" width={96} height={96} />
        <Skeleton width="60%" height={32} />
        <Skeleton width="40%" />
      </Stack>
    );
  }

  if (error) return <Alert severity="error">{error.message}</Alert>;
  const u = data?.publicUserProfile;
  if (!u) return <Alert severity="warning">User not found.</Alert>;
  const isOwner = data?.me?.user_id && data.me.user_id === u.user_id;

  return (
    <Stack spacing={3} sx={{ pt: 1, pb: 4 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <IconButton
          onClick={() => navigate(-1)}
          aria-label="Go back"
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" fontWeight={700}>
          Profile
        </Typography>
      </Stack>

      <PublicProfileHeader user={u} />
      {isOwner && <PublicProfileOwnerActions />}
      <PublicProfileBadges userId={u.user_id} />
    </Stack>
  );
}
