import { useEffect, useRef, useState } from 'react';
import { FlatList, useWindowDimensions } from 'react-native';
import { XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { ReelVideo } from '@/components/explore/ReelVideo';
import { PodShopSliderDocument } from '@/graphql/shop';
import { graphqlRequest } from '@/services/graphql.client';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

import { SlideOverlay } from './SlideOverlay';
import { SliderArrow } from './SliderArrow';
import type { SliderMedia } from './types';

/** Page side padding the slider is inset by — its corners sit inside it. */
const SIDE_INSET = 16;

/** The global Pod Shop top slider — admin-managed image/video media + overlay
 * copy/CTA (products portal), shown above the Pod Shop grid. Hidden until media
 * is configured. RN twin of mWeb's shop-page slider. */
export function PodShopSlider() {
  const { t } = useTranslation();
  const { surface, color } = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();
  const [media, setMedia] = useState<SliderMedia[]>([]);
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<SliderMedia>>(null);
  // Each page is the inset card's width, so paging still lands one slide a swipe.
  const width = screenWidth - SIDE_INSET * 2;
  const height = Math.round(width * 0.5);

  const goToIndex = (next: number) => {
    const clamped = Math.max(0, Math.min(media.length - 1, next));
    listRef.current?.scrollToOffset({ offset: clamped * width, animated: true });
    setIndex(clamped);
  };

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
    <YStack
      testID="pod-shop-slider"
      width={width}
      height={height}
      marginHorizontal={SIDE_INSET}
      borderRadius={24}
      overflow="hidden"
      backgroundColor="$soft"
    >
      <FlatList
        ref={listRef}
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
      {media.length > 1 && index > 0 ? (
        <SliderArrow
          testID="pod-shop-slider-prev"
          direction="left"
          label={t('ui.scrollRail.previous')}
          color={color}
          surface={surface}
          onPress={() => goToIndex(index - 1)}
        />
      ) : null}
      {media.length > 1 && index < media.length - 1 ? (
        <SliderArrow
          testID="pod-shop-slider-next"
          direction="right"
          label={t('ui.scrollRail.next')}
          color={color}
          surface={surface}
          onPress={() => goToIndex(index + 1)}
        />
      ) : null}
    </YStack>
  );
}
