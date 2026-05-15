import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, CircularProgress, Divider, Snackbar, Stack } from '@mui/material';
import { ME_AND_POSTS, UPDATE_MY_PROFILE } from './queries';
import MediaPickerDialog from '../../components/MediaPickerDialog';
import PostDialog from './PostDialog';
import ProfileAccordions from './ProfileAccordions';
import ProfileHeader from './ProfileHeader';
import ProfilePostsGrid from './ProfilePostsGrid';
import UploadDialog from './UploadDialog';

export default function ProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, loading, error, refetch } = useQuery(ME_AND_POSTS, {
    fetchPolicy: 'cache-and-network',
  });
  const [updateProfile] = useMutation(UPDATE_MY_PROFILE);
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  const me = data?.me;
  const posts = data?.myPosts ?? [];

  useEffect(() => {
    if (!location.search.includes('verifyEmail')) return;
    window.requestAnimationFrame(() => {
      document.getElementById('email-verification')?.scrollIntoView({ block: 'start' });
    });
  }, [location.search, me?.is_email_verified]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('newPost') !== '1') return;
    setUploadOpen(true);
    params.delete('newPost');
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  }, [location.pathname, location.search, navigate]);

  if (loading && !data) {
    return (
      <Stack alignItems="center" sx={{ p: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error || !me) {
    return <Alert severity="error">{error?.message ?? 'Unable to load profile'}</Alert>;
  }

  const saveProfilePhoto = async (profilePhoto: string) => {
    try {
      await updateProfile({ variables: { input: { profile_photo: profilePhoto } } });
      setSnack('Profile image updated.');
      await refetch();
    } catch (e: any) {
      setSnack(e?.message ?? 'Could not update profile image');
    }
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 935, mx: 'auto' }}>
      <ProfileHeader
        me={me}
        postsCount={posts.length}
        onNewPost={() => setUploadOpen(true)}
        onChangePhoto={() => setPhotoOpen(true)}
        onSettings={() => navigate('/account')}
      />

      <Divider />
      <ProfileAccordions me={me} onSaved={() => refetch()} />
      <Divider />
      <ProfilePostsGrid posts={posts} onOpenPost={setOpenPostId} onNewPost={() => setUploadOpen(true)} />

      <PostDialog
        postId={openPostId}
        meId={me.user_id}
        onClose={() => setOpenPostId(null)}
        onDeleted={() => {
          setOpenPostId(null);
          refetch();
        }}
      />

      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={(msg) => {
          setUploadOpen(false);
          setSnack(msg);
          refetch();
        }}
        onError={(msg) => setSnack(msg)}
      />

      <MediaPickerDialog
        open={photoOpen}
        onClose={() => setPhotoOpen(false)}
        onPicked={saveProfilePhoto}
        folder="/users"
        title="Update profile image"
      />

      <Snackbar open={!!snack} autoHideDuration={3500} onClose={() => setSnack(null)} message={snack ?? ''} />
    </Stack>
  );
}
