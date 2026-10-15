import { useState } from 'react';
import { Chip, Dialog, DialogContent, DialogTitle, Stack } from '@mui/material';
import PlayCircleIcon from '@mui/icons-material/PlayCircleOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';
import { venueVideosOf } from '@duncit/forms/schemas';
import type { VenueFoodItem } from '@duncit/utils';
import VenueVideoPlayer from '../../../components/media/VenueVideoPlayer';
import { useTranslation } from '../../../i18n/useTranslation';

interface Props {
  item: Pick<VenueFoodItem, 'id' | 'name' | 'videos'>;
}

/**
 * A dish's videos behind a "Watch video" chip on its card — a dialog plays
 * them (YouTube or an uploaded clip), so the card itself stays the size of a
 * menu entry and nothing loads until the guest asks for it.
 */
export default function FoodItemVideos({ item }: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const videos = venueVideosOf(item.videos);
  if (videos.length === 0) return null;

  return (
    <>
      <Chip
        size="small"
        variant="outlined"
        icon={<PlayCircleIcon />}
        label={t('mweb.venueFood.watchVideo')}
        onClick={() => setOpen(true)}
        sx={{ alignSelf: 'flex-start', fontWeight: 600 }}
        data-testid={`food-item-videos-${item.id}`}
      />
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" aria-labelledby={`food-item-videos-title-${item.id}`}>
        <DialogTitle id={`food-item-videos-title-${item.id}`} sx={{ pr: 6 }}>
          {item.name}
          <DuncitIconButton
            aria-label={t('mweb.common.close')}
            onClick={() => setOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </DuncitIconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {videos.map((video, index) => (
              <VenueVideoPlayer
                key={video.url}
                video={video}
                title={t('mweb.venueFood.videoTitle', { vars: { n: index + 1, name: item.name } })}
                testId={`food-item-video-${item.id}-${index}`}
              />
            ))}
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}
