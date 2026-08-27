import { gql, useQuery } from '@apollo/client';
import { useEntityPageMeta } from '../../app/pageMeta';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Skeleton, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DuncitIconButton } from '@duncit/buttons';
import ProfileFollowActions from './ProfileFollowActions';
import PublicProfileHeader from './PublicProfileHeader';
import PublicProfileOwnerActions from './PublicProfileOwnerActions';
import PublicProfileBadges from './PublicProfileBadges';
import PublicProfilePosts from './PublicProfilePosts';
import { useTranslation } from '../../i18n/useTranslation';

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
      follows_viewer
      inbound_request_id
      can_view_content
    }
    me {
      user_id
      following_user_ids
    }
  }
`;

export default function PublicProfilePage() {
  const { t } = useTranslation();
  // `/u/:handle` carries the @username, and a raw user id for every link
  // shared before handles existed. `publicUserProfile` resolves both, so the
  // page passes it straight through.
  const { handle = '' } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useQuery(PUBLIC_PROFILE, {
    variables: { user_id: handle },
    fetchPolicy: 'cache-and-network',
  });
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
  if (!u) return <Alert severity="warning">{t('mweb.publicProfile.userNotFound')}</Alert>;
  const isOwner = data?.me?.user_id && data.me.user_id === u.user_id;

  return (
    <Stack spacing={3} sx={{ pt: 1, pb: 4 }}>
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        <DuncitIconButton
          onClick={() => navigate(-1)}
          aria-label={t('mweb.common.goBack')}
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <ArrowBackIcon />
        </DuncitIconButton>
        <Typography variant="h6" sx={{
          fontWeight: 700
        }}>
          Profile
        </Typography>
      </Stack>

      <PublicProfileHeader user={u} viewerId={data?.me?.user_id} />
      {!isOwner && <ProfileFollowActions profile={u} onChanged={refetch} />}
      {isOwner && <PublicProfileOwnerActions />}
      <PublicProfileBadges userId={u.user_id} />
      <PublicProfilePosts
        userId={u.user_id}
        canView={isOwner || u.can_view_content !== false}
        meId={data?.me?.user_id ?? ''}
        name={u.full_name || u.username || ''}
        photo={u.profile_photo}
      />
    </Stack>
  );
}
