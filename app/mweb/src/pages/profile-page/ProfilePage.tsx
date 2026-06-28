import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, CircularProgress, Snackbar, Stack } from '@mui/material';
import { ME_AND_POSTS } from './queries';
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
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
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

  return (
    <Stack spacing={2.5} sx={{ maxWidth: 935, mx: 'auto', px: { xs: 0.5, sm: 0 }, pb: 6 }}>
      <ProfileHeader
        me={me}
        postsCount={posts.length}
        onNewPost={() => setUploadOpen(true)}
        onSettings={() => navigate('/account')}
        onChanged={() => refetch()}
      />

      <ProfileAccordions me={me} onSaved={() => refetch()} />
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

      <Snackbar open={!!snack} autoHideDuration={3500} onClose={() => setSnack(null)} message={snack ?? ''} />
    </Stack>
  );
}
