import { useEffect, useRef, useState } from 'react';
import { FlatList, Linking, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { ReelVideo } from '@/components/explore/ReelVideo';
import { PodShopSliderDocument } from '@/graphql/shop';
import { graphqlRequest } from '@/services/graphql.client';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE, TOUCH_TARGET } from '@duncit/buttons-native';

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
        <Text role="heading" fontSize={24} fontWeight="600" color="#ffffff" maxWidth={260}>
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
          tabIndex={0}
          aria-label={media.cta_label}
          onPress={() => openSliderCta(media.cta_url)}
          marginTop={14}
          alignSelf="flex-start"
          paddingHorizontal={16}
          paddingVertical={9}
          borderRadius={999}
          backgroundColor="#ffffff"
          pressStyle={PRESS_STYLE.control}
        >
          <Text fontSize={13} fontWeight="600" color="$accent">
            {media.cta_label}
          </Text>
        </XStack>
      ) : null}
    </YStack>
  );
}

/** Page side padding the slider is inset by — its corners sit inside it. */
const SIDE_INSET = 16;
const ARROW_SIZE = 32;

/** Left/right pager arrow; hidden at whichever end has no more slides.
 * Hoisted to module scope (S6478). */
function SliderArrow({
  testID,
  direction,
  label,
  color,
  surface,
  onPress,
}: Readonly<{
  testID: string;
  direction: 'left' | 'right';
  label: string;
  color: string;
  surface: string;
  onPress: () => void;
}>) {
  const hitSlop = Math.max(0, (TOUCH_TARGET - ARROW_SIZE) / 2);
  return (
    <YStack
      testID={testID}
      role="button"
      aria-label={label}
      tabIndex={0}
      hitSlop={hitSlop}
      onPress={onPress}
      position="absolute"
      top={0}
      bottom={0}
      {...(direction === 'left' ? { left: 8 } : { right: 8 })}
      width={ARROW_SIZE}
      alignItems="center"
      justifyContent="center"
      pressStyle={PRESS_STYLE.ghost}
      hoverStyle={PRESS_STYLE.ghost}
    >
      <YStack
        width={ARROW_SIZE}
        height={ARROW_SIZE}
        borderRadius={ARROW_SIZE / 2}
        alignItems="center"
        justifyContent="center"
        backgroundColor={surface}
      >
        <MaterialIcons
          name={direction === 'left' ? 'chevron-left' : 'chevron-right'}
          size={20}
          color={color}
        />
      </YStack>
    </YStack>
  );
}

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
