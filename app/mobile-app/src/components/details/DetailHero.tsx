import { useState, type ComponentProps, type ReactNode } from 'react';
import { FlatList, StyleSheet, useWindowDimensions } from 'react-native';
import { AppImage } from '@/components/AppImage';

import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Spinner, XStack, YStack } from 'tamagui';

import { ImageViewerModal } from '@/components/ImageViewerModal';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface Media {
  url: string;
  type: string;
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
      pressStyle={{ opacity: 0.7 }}
    >
      {loading ? (
        <Spinner color="#ffffff" />
      ) : (
        <MaterialIcons name={icon} size={20} color="#ffffff" />
      )}
    </XStack>
  );
}

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
  const images = media.filter((m) => m.type === 'IMAGE' && !!m.url).map((m) => m.url);
  const [index, setIndex] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  return (
    <YStack width={width} height={height} backgroundColor="$muted">
      {images.length > 0 ? (
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(url, i) => `${i}-${url}`}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item, index: i }) => (
            <XStack
              testID={`detail-hero-image-${i}`}
              role="button"
              aria-label="View image"
              onPress={() => setViewerIndex(i)}
              width={width}
              height={height}
            >
              <AppImage source={{ uri: item }} style={{ width, height }} resizeMode="cover" />
            </XStack>
          )}
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
      {images.length > 1 ? (
        <XStack position="absolute" bottom={12} left={0} right={0} justifyContent="center" gap={6}>
          {images.map((url, i) => (
            <YStack
              key={`${i}-${url}`}
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
