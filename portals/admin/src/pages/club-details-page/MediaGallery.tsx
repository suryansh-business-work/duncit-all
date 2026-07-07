import { useState } from 'react';
import { Box, Card, CardContent, Chip, Divider, Stack, Typography } from '@mui/material';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import MediaLightbox from './MediaLightbox';
import { isVideoMedia, type ClubMedia } from './types';

interface Props {
  title: string;
  icon: React.ReactNode;
  items: ClubMedia[];
  emptyText: string;
}

/** A titled card of media thumbnails. Clicking any tile opens the shared
 * lightbox at that position so the admin can review each asset full-size. */
export default function MediaGallery({ title, icon, items, emptyText }: Readonly<Props>) {
  const [index, setIndex] = useState<number | null>(null);

  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          {icon}
          <Typography variant="subtitle1" fontWeight={900}>
            {title}
          </Typography>
          <Chip size="small" label={items.length} sx={{ ml: 0.5 }} />
        </Stack>
        <Divider sx={{ mb: 1.5 }} />

        {items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {emptyText}
          </Typography>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gap: 1,
              gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))',
            }}
          >
            {items.map((media, i) => (
              <Box
                key={media.url}
                role="button"
                tabIndex={0}
                aria-label={`Open ${title} ${i + 1}`}
                onClick={() => setIndex(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setIndex(i);
                }}
                sx={{
                  position: 'relative',
                  aspectRatio: '1 / 1',
                  borderRadius: 2,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  bgcolor: 'action.hover',
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'transform 120ms ease, box-shadow 120ms ease',
                  '&:hover': { transform: 'scale(1.03)', boxShadow: 3 },
                }}
              >
                {isVideoMedia(media) ? (
                  <Box
                    component="video"
                    src={media.url}
                    preload="metadata"
                    muted
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <Box
                    component="img"
                    src={media.url}
                    alt={`${title} ${i + 1}`}
                    loading="lazy"
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                )}
                {isVideoMedia(media) && (
                  <PlayCircleIcon
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      color: 'common.white',
                      fontSize: 40,
                      filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))',
                    }}
                  />
                )}
              </Box>
            ))}
          </Box>
        )}
      </CardContent>

      <MediaLightbox items={items} index={index} onNavigate={setIndex} onClose={() => setIndex(null)} />
    </Card>
  );
}
