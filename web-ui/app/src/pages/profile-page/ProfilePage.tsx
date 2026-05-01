import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  ImageList,
  ImageListItem,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import SettingsIcon from '@mui/icons-material/Settings';
import GridOnIcon from '@mui/icons-material/GridOn';
import { ME_AND_POSTS } from './queries';
import UploadDialog from './UploadDialog';
import PostDialog from './PostDialog';

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography component="span" fontWeight={700}>
        {value}
      </Typography>{' '}
      <Typography component="span" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useQuery(ME_AND_POSTS, {
    fetchPolicy: 'cache-and-network',
  });

  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  const me = data?.me;
  const posts = data?.myPosts ?? [];

  if (loading && !data) {
    return (
      <Stack alignItems="center" sx={{ p: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }
  if (error || !me)
    return <Alert severity="error">{error?.message ?? 'Unable to load profile'}</Alert>;

  return (
    <Stack spacing={3} sx={{ maxWidth: 935, mx: 'auto' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 2, sm: 4 }}
        alignItems="center"
        sx={{ px: { xs: 0, sm: 2 }, pt: 1 }}
      >
        <Avatar
          src={me.profile_photo || undefined}
          sx={{
            width: { xs: 88, sm: 150 },
            height: { xs: 88, sm: 150 },
            bgcolor: 'primary.main',
            fontSize: { xs: 36, sm: 56 },
          }}
        >
          {(me.first_name?.[0] ?? 'U').toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1, width: '100%' }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'center', sm: 'center' }}
          >
            <Typography variant="h5" fontWeight={400}>
              {me.full_name || `${me.first_name} ${me.last_name}`}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddPhotoAlternateIcon />}
                onClick={() => setUploadOpen(true)}
              >
                New Post
              </Button>
              <Tooltip title="Account settings">
                <IconButton size="small" onClick={() => navigate('/account')}>
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
          <Stack
            direction="row"
            spacing={4}
            sx={{ mt: 2, justifyContent: { xs: 'center', sm: 'flex-start' } }}
          >
            <Stat label="posts" value={posts.length} />
            <Stat label="followers" value={0} />
            <Stat label="following" value={0} />
          </Stack>
          {me.bio && (
            <Typography variant="body2" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>
              {me.bio}
            </Typography>
          )}
        </Box>
      </Stack>

      <Divider />

      <Stack direction="row" justifyContent="center" spacing={4}>
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ py: 1 }}>
          <GridOnIcon fontSize="small" />
          <Typography variant="caption" letterSpacing={1.5}>
            POSTS
          </Typography>
        </Stack>
      </Stack>

      {posts.length === 0 ? (
        <Stack alignItems="center" spacing={2} sx={{ py: 6, color: 'text.secondary' }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              border: 2,
              borderColor: 'currentColor',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AddPhotoAlternateIcon fontSize="large" />
          </Box>
          <Typography variant="h6">Share Photos</Typography>
          <Typography variant="body2">
            When you share photos, they will appear on your profile.
          </Typography>
          <Button onClick={() => setUploadOpen(true)}>Share your first photo</Button>
        </Stack>
      ) : (
        <ImageList cols={3} gap={4} sx={{ m: 0 }}>
          {posts.map((p: any) => (
            <ImageListItem
              key={p.id}
              onClick={() => setOpenPostId(p.id)}
              sx={{
                cursor: 'pointer',
                aspectRatio: '1 / 1',
                position: 'relative',
                overflow: 'hidden',
                '&:hover .post-overlay': { opacity: 1 },
              }}
            >
              <Box
                component="img"
                src={p.image_url}
                alt={p.caption || 'post'}
                loading="lazy"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
              <Box
                className="post-overlay"
                sx={{
                  position: 'absolute',
                  inset: 0,
                  bgcolor: 'rgba(0,0,0,0.45)',
                  color: 'common.white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  opacity: 0,
                  transition: 'opacity 150ms',
                }}
              >
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <FavoriteIcon fontSize="small" />
                  <Typography variant="body2" fontWeight={700}>
                    {p.likes_count}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <ChatBubbleOutlineIcon fontSize="small" />
                  <Typography variant="body2" fontWeight={700}>
                    {p.comments_count}
                  </Typography>
                </Stack>
              </Box>
            </ImageListItem>
          ))}
        </ImageList>
      )}

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

      <Snackbar
        open={!!snack}
        autoHideDuration={3500}
        onClose={() => setSnack(null)}
        message={snack ?? ''}
      />
    </Stack>
  );
}
