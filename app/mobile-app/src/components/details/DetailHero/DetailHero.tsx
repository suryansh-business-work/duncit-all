import { useState, type ReactNode } from 'react';
import { FlatList, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { AppImage } from '@/components/AppImage';
import { ImageViewerModal } from '@/components/ImageViewerModal';
import { HeroVideo } from '@/components/details/HeroVideo';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { HeroButton } from './HeroButton';
import { heroSlides, type HeroMedia, type HeroSlide } from './heroSlides';
import { SlideCounter } from './SlideCounter';

/** The page's side padding — the inset hero sits inside it. */
const GUTTER = 16;
const RADIUS = 24;

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
  const topRadius = fullBleed ? 0 : RADIUS;
  const slides = heroSlides(media);
  const images = slides.filter((s) => !s.video).map((s) => s.url);
  const [index, setIndex] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const renderSlide = ({ item, index: i }: { item: HeroSlide; index: number }) => {
    if (item.video) {
      return (
        <HeroVideo
          testID={`detail-hero-video-${i}`}
          url={item.url}
          isActive={i === index}
          width={width}
          height={height}
        />
      );
    }
    return (
      <XStack
        pressStyle={PRESS_STYLE.surface}
        testID={`detail-hero-image-${i}`}
        role="button"
        aria-label={t('mweb.podDetails.viewImage')}
        onPress={() => setViewerIndex(item.viewerIndex)}
        width={width}
        height={height}
      >
        <AppImage source={{ uri: item.url }} style={{ width, height }} resizeMode="cover" />
      </XStack>
    );
  };

  const topBar = (
    <XStack justifyContent="space-between" alignItems="center" pointerEvents="box-none">
      <HeroButton testID="detail-back" icon="arrow-back" onPress={onBack} overMedia={fullBleed} />
      <XStack gap={8}>{children}</XStack>
    </XStack>
  );

  const frame = (
    <YStack
      width={width}
      height={height}
      borderTopLeftRadius={topRadius}
      borderTopRightRadius={topRadius}
      borderBottomLeftRadius={RADIUS}
      borderBottomRightRadius={RADIUS}
      overflow="hidden"
      backgroundColor="$soft"
    >
      {slides.length > 0 ? (
        <FlatList
          data={slides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(slide, i) => `${i}-${slide.url}`}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={renderSlide}
        />
      ) : (
        <YStack flex={1} alignItems="center" justifyContent="center">
          {placeholder ?? <MaterialIcons name="event" size={64} color={muted} />}
        </YStack>
      )}
      {slides.length > 1 ? <SlideCounter index={index} total={slides.length} /> : null}
      {fullBleed ? (
        <YStack position="absolute" top={12} left={12} right={12} pointerEvents="box-none">
          {topBar}
        </YStack>
      ) : null}
    </YStack>
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
