import { useState, type ReactNode } from 'react';
import { useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';

import { ImageViewerModal } from '@/components/ImageViewerModal';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { HeroButton } from './HeroButton';
import { HeroCarousel } from './HeroCarousel';
import { heroSlides, type HeroMedia } from './heroSlides';

/** The page's side padding — the inset hero sits inside it. */
const GUTTER = 16;

interface Props {
  media: HeroMedia[];
  height?: number;
  onBack: () => void;
  /** Edge to edge with 24px bottom corners and the controls over the photo —
   * the club hero (mWeb twin: club-details-page/ClubHero). Off: inside the
   * page padding under a top bar (mWeb twin: pod-details-page/PodHero). */
  fullBleed?: boolean;
  /** What the frame shows when there is no media (default: a muted calendar). */
  placeholder?: ReactNode;
  children?: ReactNode;
}

/** Shared details hero: a back button and an optional row of action buttons
 * (passed as children) with a media carousel — inset below the bar, or
 * full-bleed with the bar over it. */
export function DetailHero({
  media,
  height = 280,
  onBack,
  fullBleed = false,
  placeholder,
  children,
}: Readonly<Props>) {
  const { width: windowWidth } = useWindowDimensions();
  const { muted } = useThemeColors();
  const { t } = useTranslation();
  const width = fullBleed ? windowWidth : windowWidth - GUTTER * 2;
  const images = heroSlides(media)
    .filter((s) => !s.video)
    .map((s) => s.url);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const topBar = (
    <XStack justifyContent="space-between" alignItems="center" pointerEvents="box-none">
      <HeroButton
        testID="detail-back"
        icon="arrow-back"
        label={t('mweb.common.back')}
        onPress={onBack}
        overMedia={fullBleed}
      />
      <XStack gap={8}>{children}</XStack>
    </XStack>
  );

  const frame = (
    <HeroCarousel
      media={media}
      width={width}
      height={height}
      topRadius={fullBleed ? 0 : undefined}
      placeholder={placeholder ?? <MaterialIcons name="event" size={64} color={muted} />}
      onOpen={setViewerIndex}
    >
      {fullBleed ? (
        <YStack position="absolute" top={12} left={12} right={12} pointerEvents="box-none">
          {topBar}
        </YStack>
      ) : null}
    </HeroCarousel>
  );

  const viewer = (
    <ImageViewerModal images={images} index={viewerIndex} onClose={() => setViewerIndex(null)} />
  );

  if (fullBleed) {
    return (
      <YStack>
        {frame}
        {viewer}
      </YStack>
    );
  }
  return (
    <YStack gap={16} paddingHorizontal={GUTTER} paddingTop={8}>
      {topBar}
      {frame}
      {viewer}
    </YStack>
  );
}
