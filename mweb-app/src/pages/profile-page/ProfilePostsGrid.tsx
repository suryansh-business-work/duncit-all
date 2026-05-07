import { Box, Button, ImageList, ImageListItem, Stack, Typography } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import FavoriteIcon from '@mui/icons-material/Favorite';
import GridOnIcon from '@mui/icons-material/GridOn';

interface Props {
  posts: any[];
  onOpenPost: (id: string) => void;
  onNewPost: () => void;
}

export default function ProfilePostsGrid({ posts, onOpenPost, onNewPost }: Props) {
  return (
    <>
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
          <Typography variant="body2">When you share photos, they will appear on your profile.</Typography>
          <Button onClick={onNewPost}>Share your first photo</Button>
        </Stack>
      ) : (
        <ImageList cols={3} gap={4} sx={{ m: 0 }}>
          {posts.map((post: any) => (
            <ImageListItem key={post.id} onClick={() => onOpenPost(post.id)} sx={{ cursor: 'pointer', aspectRatio: '1 / 1', position: 'relative', overflow: 'hidden', '&:hover .post-overlay': { opacity: 1 } }}>
              <Box component="img" src={post.image_url} alt={post.caption || 'post'} loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <Box className="post-overlay" sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.45)', color: 'common.white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, opacity: 0, transition: 'opacity 150ms' }}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <FavoriteIcon fontSize="small" />
                  <Typography variant="body2" fontWeight={700}>{post.likes_count}</Typography>
                </Stack>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <ChatBubbleOutlineIcon fontSize="small" />
                  <Typography variant="body2" fontWeight={700}>{post.comments_count}</Typography>
                </Stack>
              </Box>
            </ImageListItem>
          ))}
        </ImageList>
      )}
    </>
  );
}
