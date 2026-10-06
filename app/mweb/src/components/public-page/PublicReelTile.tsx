import { useState } from 'react';
import { Box, ButtonBase } from '@mui/material';
import { coverImageUrl } from '@duncit/utils';
import ExploreReelVideo from '../../pages/explore-page/ExploreReelVideo';
import { useTranslation } from '../../i18n/useTranslation';
import type { PublicReelPod } from './queries';

/** A muted tile never asks for sound, so a refused unmute has nothing to undo. */
const STAYS_MUTED = (): void => undefined;

interface Props {
  pod: PublicReelPod & { reel_url: string };
  onOpen: (pod: PublicReelPod) => void;
}

/**
 * One reel in a public page's Reels row: the pod's cover with its reel playing
 * over it, muted, while the tile is hovered or focused (so a row of reels does
 * not stream every video at once). Tapping it opens the pod.
 */
export default function PublicReelTile({ pod, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);
  const cover = coverImageUrl(pod.pod_images_and_videos);

  return (
    <ButtonBase
      data-testid={`public-reel-${pod.id}`}
      focusRipple
      aria-label={t('publicPage.reels.open', { vars: { name: pod.pod_title } })}
      onClick={() => onOpen(pod)}
      onMouseEnter={() => setPlaying(true)}
      onMouseLeave={() => setPlaying(false)}
      onFocus={() => setPlaying(true)}
      onBlur={() => setPlaying(false)}
      sx={{ position: 'relative', flex: '0 0 auto', width: 128, aspectRatio: '9 / 16', borderRadius: 2, overflow: 'hidden', bgcolor: 'action.hover' }}
    >
      {cover && (
        <Box component="img" src={cover} alt="" sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
      <ExploreReelVideo
        src={pod.reel_url}
        muted
        active={playing}
        preload={playing}
        onSoundBlocked={STAYS_MUTED}
        testId={`public-reel-${pod.id}-video`}
      />
    </ButtonBase>
  );
}
