import { gql, useMutation, useQuery } from '@apollo/client';
import { useEntityPageMeta } from '../../app/pageMeta';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  IconButton,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { followActionFor, readFollowStatus } from '@duncit/utils';
import FollowButton from '../../components/FollowButton';
import PublicProfileHeader from './PublicProfileHeader';
import PublicProfileOwnerActions from './PublicProfileOwnerActions';
import PublicProfileBadges from './PublicProfileBadges';
import PublicProfilePosts from './PublicProfilePosts';

const PUBLIC_PROFILE = gql`
  query PublicProfile($user_id: ID!) {
    publicUserProfile(user_id: $user_id) {
      user_id
      username
      full_name
      first_name
      last_name
      profile_photo
      bio
      city
      zone
      followers_count
      following_count
      is_private
      is_following
      follow_status
      can_view_content
    }
    me {
      user_id
      following_user_ids
    }
  }
`;

const CANCEL_FOLLOW_REQUEST = gql`
  mutation CancelFollowRequestFromProfile($user_id: ID!) {
    cancelFollowRequest(user_id: $user_id) {
      user_id
      following_user_ids
    }
  }
`;

const FOLLOW_USER = gql`
  mutation FollowUserFromProfile($user_id: ID!) {
    followUser(user_id: $user_id) {
      user_id
      following_user_ids
    }
  }
`;

const UNFOLLOW_USER = gql`
  mutation UnfollowUserFromProfile($user_id: ID!) {
    unfollowUser(user_id: $user_id) {
      user_id
      following_user_ids
    }
  }
`;

export default function PublicProfilePage() {
  const { userId = '' } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useQuery(PUBLIC_PROFILE, {
    variables: { user_id: userId },
    fetchPolicy: 'cache-and-network',
  });
  const [follow, followState] = useMutation(FOLLOW_USER);
  const [unfollow, unfollowState] = useMutation(UNFOLLOW_USER);
  const [cancelRequest, cancelState] = useMutation(CANCEL_FOLLOW_REQUEST);
  useEntityPageMeta(data?.publicUserProfile?.full_name);

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
  // The server is the authority on the state — a private profile answers a
  // follow with REQUESTED, so the button must read its verdict rather than
  // assume the tap succeeded.
  const status = readFollowStatus(u);
  const MUTATIONS = { FOLLOW: follow, UNFOLLOW: unfollow, CANCEL_REQUEST: cancelRequest };
  const toggleFollow = async () => {
    await MUTATIONS[followActionFor(status)]({ variables: { user_id: u.user_id } });
    await refetch();
  };

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

      <PublicProfileHeader user={u} viewerId={data?.me?.user_id} />
      {!isOwner && (
        <Stack direction="row" justifyContent="center">
          <FollowButton
            status={status}
            loading={followState.loading || unfollowState.loading || cancelState.loading}
            onToggle={() => {
              toggleFollow().catch(() => undefined);
            }}
          />
        </Stack>
      )}
      {isOwner && <PublicProfileOwnerActions />}
      <PublicProfileBadges userId={u.user_id} />
      <PublicProfilePosts
        userId={u.user_id}
        canView={isOwner || u.can_view_content !== false}
        meId={data?.me?.user_id ?? ''}
      />
    </Stack>
  );
}
