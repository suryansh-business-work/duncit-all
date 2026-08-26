import { useMemo, useState } from 'react';
import { Avatar, Stack } from '@mui/material';
import HomeStatusViewer from '../home-page/HomeStatusViewer';
import { buildStoryViewerItem } from '../home-page/storyViewerItem';

export interface ProfileStory {
  id: string;
  image_url: string;
  media_type?: string | null;
  caption?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
}

interface Props {
  name: string;
  photo?: string | null;
  stories: ProfileStory[];
}

/**
 * A member's active stories on their public profile.
 *
 * The rings open the SAME viewer Home does, so a story opened from a profile
 * runs its 15s timeline and auto-advances like every other story on the app.
 * It used to open the plain moments lightbox — a still image with a close
 * button and no progress bar at all.
 */
export default function PublicProfileStories({ name, photo, stories }: Readonly<Props>) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // The rail and the viewer read the same oldest → newest slides, so the ring
  // that was tapped is the slide that opens.
  const item = useMemo(
    () => buildStoryViewerItem(name, photo ?? null, stories),
    [name, photo, stories],
  );
  const slides = item?.slides ?? [];
  if (slides.length === 0) return null;

  return (
    <>
      <Stack direction="row" spacing={1.25} sx={{ overflowX: 'auto', pb: 0.5 }}>
        {slides.map((slide, index) => (
          <Avatar
            key={slide.id}
            src={slide.mediaUrl ?? undefined}
            role="button"
            aria-label={`Open status ${index + 1}`}
            onClick={() => setOpenIndex(index)}
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

      {openIndex !== null && (
        <HomeStatusViewer
          item={item}
          startIndex={openIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}
