import { useEffect, useState } from 'react';
import { FlatList, Linking, useWindowDimensions } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { ReelVideo } from '@/components/explore/ReelVideo';
import { PodShopSliderDocument } from '@/graphql/shop';
import { graphqlRequest } from '@/services/graphql.client';

interface SliderMedia {
  url: string;
  type: string;
  order: number;
  heading: string;
  subheading: string;
  cta_label: string;
  cta_url: string;
}

/** Open a slide CTA target (external URL or configured deep link). */
export function openSliderCta(url: string): void {
  const target = url.trim();
  if (!target) return;
  Linking.openURL(target).catch(() => undefined);
}

/** Overlay copy + CTA on a slide; hoisted so it isn't redefined each render. */
function SlideOverlay({ media }: Readonly<{ media: SliderMedia }>) {
  if (!media.heading && !media.subheading && !media.cta_label) return null;
  return (
    <YStack
      position="absolute"
      top={0}
      bottom={0}
      left={0}
      right={0}
      justifyContent="center"
      padding={20}
      backgroundColor="rgba(0,0,0,0.35)"
    >
      {media.heading ? (
        <Text fontSize={24} fontWeight="700" color="#ffffff" maxWidth={260}>
          {media.heading}
        </Text>
      ) : null}
      {media.subheading ? (
        <Text fontSize={13} color="rgba(255,255,255,0.92)" marginTop={6} maxWidth={240}>
          {media.subheading}
        </Text>
      ) : null}
      {media.cta_label ? (
        <XStack
          testID="pod-shop-slide-cta"
          role="button"
          aria-label={media.cta_label}
          onPress={() => openSliderCta(media.cta_url)}
          marginTop={14}
          alignSelf="flex-start"
          paddingHorizontal={16}
          paddingVertical={9}
          borderRadius={999}
          backgroundColor="#ffffff"
          pressStyle={{ opacity: 0.85 }}
        >
          <Text fontSize={13} fontWeight="600" color="#111111">
            {media.cta_label}
          </Text>
        </XStack>
      ) : null}
    </YStack>
  );
}

/** The global Pod Shop top slider — admin-managed image/video media + overlay
 * copy/CTA (products portal), shown above the Pod Shop grid. Hidden until media
 * is configured. RN twin of mWeb's shop-page slider. */
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
          heading: m.heading ?? '',
          subheading: m.subheading ?? '',
          cta_label: m.cta_label ?? '',
          cta_url: m.cta_url ?? '',
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
            <SlideOverlay media={item} />
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
