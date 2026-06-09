import { useState } from 'react';
import { FlatList, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';

interface Media {
  url: string;
  type: string;
}

interface ExploreMediaCarouselProps {
  media: Media[];
  fallbackUrl?: string | null;
  width: number;
  height: number;
  dotsBottom?: number;
}

/** Full-bleed horizontal image carousel behind a reel. Videos are skipped for
 * now (no native player wired); the club cover is the fallback. */
export function ExploreMediaCarousel({
  media,
  fallbackUrl,
  width,
  height,
  dotsBottom = 150,
}: Readonly<ExploreMediaCarouselProps>) {
  const images = media.filter((m) => m.type === 'IMAGE' && !!m.url).map((m) => m.url);
  const items = images.length > 0 ? images : fallbackUrl ? [fallbackUrl] : [];
  const [index, setIndex] = useState(0);

  if (items.length === 0) {
    return (
      <YStack
        width={width}
        height={height}
        alignItems="center"
        justifyContent="center"
        backgroundColor="#15131c"
      >
        <MaterialIcons name="event" size={80} color="#4b4658" />
      </YStack>
    );
  }

  return (
    <YStack width={width} height={height}>
      <FlatList
        data={items}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(url, i) => `${i}-${url}`}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={{ width, height }} resizeMode="cover" />
        )}
      />
      {items.length > 1 ? (
        <XStack
          position="absolute"
          bottom={dotsBottom}
          left={0}
          right={0}
          justifyContent="center"
          gap={6}
        >
          {items.map((url, i) => (
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
    </YStack>
  );
}
