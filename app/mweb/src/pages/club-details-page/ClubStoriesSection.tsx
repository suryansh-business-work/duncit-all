import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { Avatar, Box, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import MomentLightbox from '../../components/moments/MomentLightbox';
import { useStatusUpload } from '../../components/status-upload/StatusUploadProvider';
import { CLUB_STORIES } from '../ClubDetailsPage/clubDetailsQueries';

interface ClubStory {
  id: string;
  image_url: string;
  media_type: string;
  caption: string;
  author?: { user_id: string; full_name?: string | null; profile_photo?: string | null } | null;
}

interface Props {
  clubId: string;
}

/** Ephemeral 24h club stories (Bug 6) — a rail of circular thumbnails the user
 *  can tap to view, plus an "Add" tile that posts a story to this club. */
export default function ClubStoriesSection({ clubId }: Readonly<Props>) {
  const { openClubPicker } = useStatusUpload();
  const [lightbox, setLightbox] = useState<number | null>(null);
  const { data } = useQuery<{ clubStories: ClubStory[] }>(CLUB_STORIES, {
    variables: { id: clubId },
    skip: !clubId,
    fetchPolicy: 'cache-and-network',
  });
  const stories = data?.clubStories ?? [];
  const moments = stories.map((s) => ({ url: s.image_url, type: s.media_type }));

  return (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900 }}>
        <AutoStoriesIcon sx={{ fontSize: 15, mb: '-2px', mr: 0.5 }} />
        Stories
      </Typography>
      <Stack direction="row" spacing={1.5} sx={{ overflowX: 'auto', pt: 0.5, pb: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
        <Stack
          alignItems="center"
          spacing={0.5}
          role="button"
          aria-label="Add a story to this club"
          onClick={() => openClubPicker(clubId)}
          sx={{ cursor: 'pointer', width: 66, flex: '0 0 auto' }}
        >
          <Avatar sx={{ width: 58, height: 58, bgcolor: 'action.hover', color: 'primary.main', border: '2px dashed', borderColor: 'primary.main' }}>
            <AddIcon />
          </Avatar>
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            Add
          </Typography>
        </Stack>
        {stories.map((story, index) => (
          <Stack
            key={story.id}
            alignItems="center"
            spacing={0.5}
            role="button"
            aria-label={`Story by ${story.author?.full_name ?? 'member'}`}
            onClick={() => setLightbox(index)}
            sx={{ cursor: 'pointer', width: 66, flex: '0 0 auto' }}
          >
            <Avatar
              src={story.image_url}
              sx={{ width: 58, height: 58, border: '2px solid', borderColor: 'primary.main' }}
            />
            <Typography variant="caption" sx={{ fontWeight: 700 }} noWrap>
              {story.author?.full_name?.split(' ')[0] ?? 'Member'}
            </Typography>
          </Stack>
        ))}
      </Stack>
      <MomentLightbox
        moments={moments}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onIndexChange={setLightbox}
      />
    </Box>
  );
}
