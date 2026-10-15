import { YStack } from 'tamagui';
import { venueVideosOf } from '@duncit/forms/schemas';

import { VenueVideoPlayer } from '@/components/details/VenueVideoPlayer';
import { SectionHeader } from '@/components/SectionHeader';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** Uploaded clips and YouTube links, in the owner's order. */
  videos?: readonly string[] | null;
  venueName: string;
}

/** The venue's videos under its photos — nothing plays until pressed. Tamagui twin of the videos block in mWeb's VenueImagesGrid. */
export function VenueVideosSection({ videos, venueName }: Readonly<Props>) {
  const { t } = useTranslation();
  const playable = venueVideosOf(videos);
  if (playable.length === 0) return null;

  return (
    <YStack gap={10} testID="venue-videos">
      <SectionHeader title={t('mweb.venueFood.videos')} />
      {playable.map((video, index) => (
        <VenueVideoPlayer
          key={video.url}
          video={video}
          title={t('mweb.venueFood.videoTitle', { vars: { n: index + 1, name: venueName } })}
          testID={`venue-video-${index}`}
        />
      ))}
    </YStack>
  );
}
