import { useState, type ReactNode } from 'react';
import { FlatList } from 'react-native';
import { XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { AppImage } from '@/components/AppImage';
import { HeroVideo } from '@/components/details/HeroVideo';
import { useTranslation } from '@/hooks/useTranslation';
import { heroSlides, type HeroMedia, type HeroSlide } from './heroSlides';
import { SlideCounter } from './SlideCounter';

const RADIUS = 24;

interface Props {
  media: readonly HeroMedia[];
  width: number;
  height: number;
  /** 0 when the frame runs edge to edge under the status bar. */
  topRadius?: number;
  /** What the frame shows when there is no media. */
  placeholder: ReactNode;
  /** A still was tapped — its index among the stills, for the full-screen viewer. */
  onOpen: (viewerIndex: number) => void;
  /** Laid over the media (the full-bleed hero's top bar). */
  children?: ReactNode;
}

/** The swipeable media frame with its "2/5" counter — the pod, club and venue
 * heroes all page through their photos and clips with it. */
export function HeroCarousel({
  media,
  width,
  height,
  topRadius = RADIUS,
  placeholder,
  onOpen,
  children,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const slides = heroSlides(media);
  const [index, setIndex] = useState(0);

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
        tabIndex={0}
        aria-label={t('mweb.podDetails.viewImage')}
        onPress={() => onOpen(item.viewerIndex)}
        width={width}
        height={height}
      >
        <AppImage source={{ uri: item.url }} style={{ width, height }} resizeMode="cover" />
      </XStack>
    );
  };

  return (
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
          {placeholder}
        </YStack>
      )}
      {slides.length > 1 ? <SlideCounter index={index} total={slides.length} /> : null}
      {children}
    </YStack>
  );
}
