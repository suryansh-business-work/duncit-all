import { Box, ButtonBase, ImageList, ImageListItem, Stack, Typography } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlined';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { DuncitButton } from '@duncit/buttons';
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
      {posts.length === 0 ? (
        <Stack data-testid="profile-posts-grid-empty" spacing={1.5} sx={{ alignItems: 'center', py: 5 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: 'action.hover',
              color: 'secondary.main',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <AddPhotoAlternateIcon sx={{ fontSize: 30 }} />
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            {t('mweb.profile.sharePhotos')}
          </Typography>
          <DuncitButton data-testid="profile-posts-grid-share-first" variant="contained" onClick={onNewPost}>
            {t('mweb.profile.shareYourFirstPhoto')}
          </DuncitButton>
        </Stack>
      ) : (
        <ImageList data-testid="profile-posts-grid" cols={3} gap={4} sx={{ m: 0 }}>
          {posts.map((post: any) => (
            <ImageListItem key={post.id} sx={{ aspectRatio: '1 / 1', overflow: 'hidden', borderRadius: '12px' }}>
              {/* A real button inside the list item: the keyboard reaches it
                  and the list keeps its listitem structure (WCAG 2.1.1). */}
              <ButtonBase
                data-testid={`profile-posts-grid-post-${post.id}`}
                onClick={() => onOpenPost(post.id)}
                sx={{ display: 'block', width: '100%', height: '100%', position: 'relative', '&:hover .post-overlay, &.Mui-focusVisible .post-overlay': { opacity: 1 } }}
              >
              <Box component="img" src={post.image_url} alt={post.caption || 'post'} loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <Box className="post-overlay" sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.45)', color: 'common.white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, opacity: 0, transition: 'opacity 150ms' }}>
                <Stack direction="row" spacing={0.5} sx={{
                  alignItems: "center"
                }}>
                  <FavoriteIcon fontSize="small" />
                  <Typography data-testid={`profile-posts-grid-post-${post.id}-likes`} variant="body2" sx={{
                    fontWeight: 700
                  }}>{post.likes_count}</Typography>
                </Stack>
                <Stack direction="row" spacing={0.5} sx={{
                  alignItems: "center"
                }}>
                  <ChatBubbleOutlineIcon fontSize="small" />
                  <Typography data-testid={`profile-posts-grid-post-${post.id}-comments`} variant="body2" sx={{
                    fontWeight: 700
                  }}>{post.comments_count}</Typography>
                </Stack>
              </Box>
              </ButtonBase>
            </ImageListItem>
          ))}
        </ImageList>
      )}
    </>
  );
}
