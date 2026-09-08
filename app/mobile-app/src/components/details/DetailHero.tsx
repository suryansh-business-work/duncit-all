import { useState, type ComponentProps, type ReactNode } from 'react';
import { FlatList, StyleSheet, useWindowDimensions } from 'react-native';
import { AppImage } from '@/components/AppImage';

import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Spinner, XStack, YStack } from 'tamagui';
import { isVideoMedia } from '@duncit/utils';

import { ImageViewerModal } from '@/components/ImageViewerModal';
import { HeroVideo } from '@/components/details/HeroVideo';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface Media {
  url: string;
  type: string;
}

/** A carousel slide: the media row, plus where its picture sits in the
 * full-screen viewer (`viewerIndex`), which only counts the still images. */
interface Slide {
  url: string;
  video: boolean;
  viewerIndex: number;
}

/** A round glassy overlay button used on the hero (back + actions). */
export function HeroButton({
  icon,
  onPress,
  active,
  loading,
  testID,
}: Readonly<{
  icon: IconName;
  onPress: () => void;
  active?: boolean;
  loading?: boolean;
  testID?: string;
}>) {
  return (
    <XStack
      testID={testID}
      role="button"
      onPress={onPress}
      width={40}
      height={40}
      borderRadius={20}
      alignItems="center"
      justifyContent="center"
      backgroundColor={active ? 'rgba(255,79,115,0.9)' : 'rgba(0,0,0,0.45)'}
      pressStyle={PRESS_STYLE.row}
    >
      {loading ? (
        <Spinner color="#ffffff" />
      ) : (
        <MaterialIcons name={icon} size={20} color="#ffffff" />
      )}
    </XStack>
  );
}

/**
 * Turn a pod's or club's cover media into carousel slides.
 *
 * The hero used to keep `type === 'IMAGE'` rows only, so a cover video was
 * dropped on the floor: a pod whose media was one clip rendered the empty
 * calendar placeholder, and mWeb — which has played them all along — showed a
 * different pod than the app did (rule 27). Videos are slides now, and the
 * viewer index is tracked separately because the full-screen viewer still
 * shows pictures alone.
 */
export const heroSlides = (media: readonly Media[]): Slide[] => {
  let viewerIndex = 0;
  return media
    .filter((m) => !!m.url)
    .map((m) => {
      const video = isVideoMedia(m);
      return { url: m.url, video, viewerIndex: video ? -1 : viewerIndex++ };
    });
};

/** Shared details hero: a horizontal media carousel with a back button and an
 * optional row of action buttons (passed as children). */
export function DetailHero({
  media,
  height = 320,
  onBack,
  children,
}: Readonly<{
  media: Media[];
  height?: number;
  onBack: () => void;
  children?: ReactNode;
}>) {
  const { width } = useWindowDimensions();
  const { t } = useTranslation();
  const slides = heroSlides(media);
  const images = slides.filter((s) => !s.video).map((s) => s.url);
  const [index, setIndex] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const renderSlide = ({ item, index: i }: { item: Slide; index: number }) => {
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

  return (
    <YStack width={width} height={height} backgroundColor="$muted">
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
          <MaterialIcons name="event" size={72} color="#ffffff" />
        </YStack>
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.55)']}
        locations={[0, 0.4, 1]}
        style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
      />
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <XStack justifyContent="space-between" alignItems="center" padding={12}>
          <HeroButton testID="detail-back" icon="arrow-back" onPress={onBack} />
          <XStack gap={8}>{children}</XStack>
        </XStack>
      </SafeAreaView>
      {slides.length > 1 ? (
        <XStack position="absolute" bottom={12} left={0} right={0} justifyContent="center" gap={6}>
          {slides.map((slide, i) => (
            <YStack
              key={`${i}-${slide.url}`}
              width={i === index ? 18 : 6}
              height={6}
              borderRadius={3}
              backgroundColor={i === index ? '#ffffff' : 'rgba(255,255,255,0.5)'}
            />
          ))}
        </XStack>
      ) : null}
      <ImageViewerModal images={images} index={viewerIndex} onClose={() => setViewerIndex(null)} />
    </YStack>
  );
}
