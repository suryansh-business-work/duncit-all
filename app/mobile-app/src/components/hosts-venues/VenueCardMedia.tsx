import { useRef, useState } from 'react';
import { FlatList, type LayoutChangeEvent } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { AppImage } from '@/components/AppImage';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/** A 3:2 frame, capped so a wide screen does not turn the photo into a banner.
 * The card used to give the cover a flat 120px band, which sliced a venue photo
 * down to a strip — this keeps the subject in view and the text below it. mWeb
 * twin (VenueCardMedia) uses the same ratio. */
const RATIO = 3 / 2;
const MAX_HEIGHT = 300;
/** Media inside a card carries its own 18px corners. */
const MEDIA_RADIUS = 18;

/** A round glassy arrow over the photo — the mouse's way through the slider on
 * Native Web, where there is nothing to swipe. */
function Arrow({
  side,
  label,
  onPress,
}: Readonly<{ side: 'left' | 'right'; label: string; onPress: () => void }>) {
  const { onPrimary } = useThemeColors();
  return (
    <XStack
      position="absolute"
      top="50%"
      left={side === 'left' ? 8 : undefined}
      right={side === 'right' ? 8 : undefined}
      marginTop={-15}
      width={30}
      height={30}
      borderRadius={15}
      alignItems="center"
      justifyContent="center"
      backgroundColor="rgba(0,0,0,0.4)"
      role="button"
      aria-label={label}
      onPress={onPress}
      pressStyle={PRESS_STYLE.row}
    >
      <MaterialIcons
        name={side === 'left' ? 'chevron-left' : 'chevron-right'}
        size={20}
        color={onPrimary}
      />
    </XStack>
  );
}

interface Props {
  /** Cover first, then the gallery — venueImages() from @duncit/utils. */
  images: string[];
  venueName: string;
  onOpen: () => void;
}

/** The photo half of a venue card: every venue image as a paged slider with
 * arrows and dots, opening the venue on tap. mWeb twin:
 * venues-page/VenueCardMedia. */
export function VenueCardMedia({ images, venueName, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  const listRef = useRef<FlatList<string>>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);

  const height = Math.min(width / RATIO, MAX_HEIGHT);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(images.length - 1, next));
    setIndex(clamped);
    listRef.current?.scrollToOffset({ offset: clamped * width, animated: true });
  };

  if (images.length === 0) {
    return (
      <YStack
        aspectRatio={RATIO}
        maxHeight={MAX_HEIGHT}
        borderRadius={MEDIA_RADIUS}
        backgroundColor="$soft"
        alignItems="center"
        justifyContent="center"
      >
        <MaterialIcons name="storefront" size={40} color={accent} />
      </YStack>
    );
  }

  const multiple = images.length > 1;
  return (
    <YStack
      testID="venue-card-media"
      aspectRatio={RATIO}
      maxHeight={MAX_HEIGHT}
      backgroundColor="#000000"
      borderRadius={MEDIA_RADIUS}
      overflow="hidden"
      onLayout={onLayout}
    >
      {width > 0 ? (
        <FlatList
          testID="venue-card-slider"
          ref={listRef}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(url) => url}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <XStack
              width={width}
              height={height}
              role="button"
              aria-label={venueName}
              onPress={onOpen}
              pressStyle={PRESS_STYLE.surface}
            >
              <AppImage
                source={{ uri: item }}
                style={{ width, height }}
                resizeMode="cover"
                recyclingKey={item}
              />
            </XStack>
          )}
        />
      ) : null}
      {multiple ? (
        <>
          <Arrow
            side="left"
            label={t('mweb.details.previousImage')}
            onPress={() => goTo(index - 1)}
          />
          <Arrow side="right" label={t('mweb.details.nextImage')} onPress={() => goTo(index + 1)} />
          <XStack position="absolute" bottom={8} left={0} right={0} justifyContent="center" gap={5}>
            {images.map((url, i) => (
              <YStack
                key={url}
                width={i === index ? 14 : 5}
                height={5}
                borderRadius={3}
                backgroundColor={i === index ? '#ffffff' : 'rgba(255,255,255,0.5)'}
              />
            ))}
          </XStack>
        </>
      ) : null}
    </YStack>
  );
}
