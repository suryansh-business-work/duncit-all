import { Box, Button, ImageList, ImageListItem, Stack, Typography } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlined';
import FavoriteIcon from '@mui/icons-material/Favorite';
import GridOnIcon from '@mui/icons-material/GridOn';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  posts: any[];
  onOpenPost: (id: string) => void;
  onNewPost: () => void;
}

export default function ProfilePostsGrid({ posts, onOpenPost, onNewPost }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <>
      <Stack direction="row" spacing={4} sx={{
        justifyContent: "center"
      }}>
        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            alignItems: "center",
            py: 1
          }}>
          <GridOnIcon fontSize="small" />
          <Typography variant="caption" sx={{
            letterSpacing: 1.5
          }}>
            POSTS
          </Typography>
        </Stack>
      </Stack>

      {posts.length === 0 ? (
        <Stack
          spacing={2}
          sx={{
            alignItems: "center",
            py: 6,
            color: 'text.secondary'
          }}>
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
          <Typography variant="h6">{t('mweb.profile.sharePhotos')}</Typography>
          <Typography variant="body2">{t('mweb.profile.whenYouSharePhotosTheyWill')}</Typography>
          <Button onClick={onNewPost}>{t('mweb.profile.shareYourFirstPhoto')}</Button>
        </Stack>
      ) : (
        <ImageList cols={3} gap={4} sx={{ m: 0 }}>
          {posts.map((post: any) => (
            <ImageListItem key={post.id} onClick={() => onOpenPost(post.id)} sx={{ cursor: 'pointer', aspectRatio: '1 / 1', position: 'relative', overflow: 'hidden', '&:hover .post-overlay': { opacity: 1 } }}>
              <Box component="img" src={post.image_url} alt={post.caption || 'post'} loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <Box className="post-overlay" sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.45)', color: 'common.white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, opacity: 0, transition: 'opacity 150ms' }}>
                <Stack direction="row" spacing={0.5} sx={{
                  alignItems: "center"
                }}>
                  <FavoriteIcon fontSize="small" />
                  <Typography variant="body2" sx={{
                    fontWeight: 700
                  }}>{post.likes_count}</Typography>
                </Stack>
                <Stack direction="row" spacing={0.5} sx={{
                  alignItems: "center"
                }}>
                  <ChatBubbleOutlineIcon fontSize="small" />
                  <Typography variant="body2" sx={{
                    fontWeight: 700
                  }}>{post.comments_count}</Typography>
                </Stack>
              </Box>
            </ImageListItem>
          ))}
        </ImageList>
      )}
    </>
  );
}
