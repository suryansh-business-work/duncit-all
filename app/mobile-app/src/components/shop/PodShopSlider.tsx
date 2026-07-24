import { useEffect, useState } from 'react';
import { FlatList, useWindowDimensions } from 'react-native';
import { XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { ReelVideo } from '@/components/explore/ReelVideo';
import { PodShopSliderDocument } from '@/graphql/shop';
import { graphqlRequest } from '@/services/graphql.client';

interface SliderMedia {
  url: string;
  type: string;
  order: number;
}

/** The global Pod Shop top slider — admin-managed image/video media (products
 * portal), shown above the Pod Shop grid. Hidden until media is configured. RN
 * twin of mWeb's shop-page slider. */
export function PodShopSlider() {
  const { width } = useWindowDimensions();
  const [media, setMedia] = useState<SliderMedia[]>([]);
  const [index, setIndex] = useState(0);
  const height = Math.round(width * 0.5);

  useEffect(() => {
    let active = true;
    graphqlRequest(PodShopSliderDocument, undefined, { auth: true })
      .then((data) => {
        if (!active) return;
        const items = data.branding.pod_shop_slider.map((m) => ({
          url: m.url,
          type: String(m.type),
          order: m.order,
        }));
        setMedia(items.sort((a, b) => a.order - b.order));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (media.length === 0) return null;

  return (
    <YStack testID="pod-shop-slider" width={width} height={height} backgroundColor="$muted">
      <FlatList
        testID="pod-shop-slider-list"
        data={media}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, i) => `${i}-${item.url}`}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index: i }) => (
          <YStack testID={`pod-shop-slide-${i}`} width={width} height={height}>
            {item.type === 'VIDEO' ? (
              <ReelVideo
                url={item.url}
                isActive={i === index}
                testID={`pod-shop-slide-video-${i}`}
              />
            ) : (
              <AppImage source={{ uri: item.url }} style={{ width, height }} resizeMode="cover" />
            )}
          </YStack>
        )}
      />
      {media.length > 1 ? (
        <XStack position="absolute" bottom={10} left={0} right={0} justifyContent="center" gap={6}>
          {media.map((item, i) => (
            <YStack
              key={`${i}-${item.url}`}
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
