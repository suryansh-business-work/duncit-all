import { useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import {
  Avatar,
  Box,
  ImageList,
  ImageListItem,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import GridOnIcon from '@mui/icons-material/GridOn';
import PostDialog from '../profile-page/post-dialog/PostDialog';
import MomentLightbox from '../../components/moments/MomentLightbox';

const PUBLIC_USER_POSTS = gql`
  query PublicUserPosts($id: ID!) {
    posts(author_id: $id) {
      id
      image_url
      caption
      likes_count
      comments_count
    }
    stories(author_id: $id) {
      id
      image_url
      media_type
    }
  }
`;

interface Props {
  userId: string;
  canView: boolean;
  meId: string;
}

/** Posts grid + active stories on a member's public profile. When the account
 * is private and the viewer is not a follower, a lock card is shown instead. */
export default function PublicProfilePosts({ userId, canView, meId }: Readonly<Props>) {
  const { data, loading } = useQuery(PUBLIC_USER_POSTS, {
    variables: { id: userId },
    skip: !canView,
    fetchPolicy: 'cache-and-network',
  });
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [storyIndex, setStoryIndex] = useState<number | null>(null);

  if (!canView) {
    return (
      <Stack
        spacing={1}
        sx={{
          alignItems: "center",
          py: 5,
          color: 'text.secondary'
        }}>
        <LockIcon />
        <Typography variant="subtitle1" sx={{
          fontWeight: 600
        }}>
          This account is private
        </Typography>
        <Typography variant="body2" sx={{
          textAlign: "center"
        }}>
          Follow this account to see their posts and status.
        </Typography>
      </Stack>
    );
  }

  const posts = data?.posts ?? [];
  const isFirstLoad = loading && !data;
  const gridSkeleton = (
    <ImageList cols={3} gap={4} sx={{ m: 0 }} data-testid="public-posts-loading">
      {['a', 'b', 'c', 'd', 'e', 'f'].map((slot) => (
        <ImageListItem key={slot}>
          <Skeleton variant="rectangular" sx={{ width: '100%', aspectRatio: '1 / 1' }} />
        </ImageListItem>
      ))}
    </ImageList>
  );

  const stories = (data?.stories ?? []).map((story: any) => ({
    url: story.image_url,
    type: story.media_type,
  }));

  const postsGrid = (
    <ImageList cols={3} gap={4} sx={{ m: 0 }}>
      {posts.map((post: any) => (
        <ImageListItem
          key={post.id}
          onClick={() => setOpenPostId(post.id)}
          sx={{ cursor: 'pointer', aspectRatio: '1 / 1', overflow: 'hidden' }}
        >
          <Box
            component="img"
            src={post.image_url}
            alt={post.caption || 'post'}
            loading="lazy"
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </ImageListItem>
      ))}
    </ImageList>
  );

  const emptyGrid = (
    <Typography
      variant="body2"
      sx={{
        color: "text.secondary",
        textAlign: "center",
        py: 4
      }}>
      No posts yet.
    </Typography>
  );

  /**
   * Three states, decided above the return so the body stays a layout
   * (S3776) — and so the first fetch no longer renders "No posts yet." for a
   * beat on every profile that does have posts.
   */
  let grid = postsGrid;
  if (isFirstLoad) grid = gridSkeleton;
  else if (posts.length === 0) grid = emptyGrid;


  return (
    <Stack spacing={1.5}>
      {stories.length > 0 && (
        <Stack direction="row" spacing={1.25} sx={{ overflowX: 'auto', pb: 0.5 }}>
          {stories.map((story: { url: string }, index: number) => (
            <Avatar
              key={story.url}
              src={story.url}
              role="button"
              aria-label={`Open status ${index + 1}`}
              onClick={() => setStoryIndex(index)}
              sx={{
                width: 64,
                height: 64,
                cursor: 'pointer',
                border: 3,
                borderColor: 'primary.main',
              }}
            />
          ))}
        </Stack>
      )}

      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          alignItems: "center",
          justifyContent: "center",
          py: 1
        }}>
        <GridOnIcon fontSize="small" />
        <Typography variant="caption" sx={{
          letterSpacing: 1.5
        }}>
          POSTS
        </Typography>
      </Stack>

      {grid}

      <PostDialog
        postId={openPostId}
        meId={meId}
        onClose={() => setOpenPostId(null)}
        onDeleted={() => setOpenPostId(null)}
      />
      <MomentLightbox
        moments={stories}
        index={storyIndex}
        onClose={() => setStoryIndex(null)}
        onIndexChange={setStoryIndex}
      />
    </Stack>
  );
}
