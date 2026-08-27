import { useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';
import { canFlipGiftCard, giftCardArtwork } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import { type GiftCardTheme } from '@/utils/gift-cards';
import { GiftCardFace } from './GiftCardFace';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** Long enough to read as a card turning over, short enough not to be in the way. */
const FLIP_MS = 600;

export interface GiftCardVisualProps {
  theme: GiftCardTheme;
  /** Category icon overlaid top-right; hidden when empty or it fails to load. */
  imageUrl: string;
  /** Admin-uploaded card faces; empty on both keeps the gradient card flat. */
  artworkFrontUrl?: string | null;
  artworkBackUrl?: string | null;
  /** Formatted face value ("₹500.00") shown large; omitted while unpicked. */
  amountLabel?: string;
  /** Redemption code — printed on owned cards only. */
  code?: string;
  /** Second line under the title (e.g. the Pod Shop caption on the picker). */
  caption?: string;
  minHeight?: number;
  /** Dense variant for the theme picker's tiles. Never flips: the tile is
   * itself pressable, so a second control inside it would fight the tap. */
  compact?: boolean;
  testID?: string;
}

/**
 * The gift card itself. Without artwork it is the gradient card it has always
 * been; once a category ships a front or a back image, the same card gains a
 * real flip between its two faces. mWeb renders the identical card (rule 27).
 */
export function GiftCardVisual({
  theme,
  imageUrl,
  artworkFrontUrl,
  artworkBackUrl,
  amountLabel,
  code,
  caption,
  minHeight = 120,
  compact = false,
  testID,
}: Readonly<GiftCardVisualProps>) {
  const { t } = useTranslation();
  const spin = useRef(new Animated.Value(0)).current;
  const [flipped, setFlipped] = useState(false);
  const artwork = giftCardArtwork(artworkFrontUrl, artworkBackUrl);
  const canFlip = !compact && canFlipGiftCard(artwork);

  const faceProps = { theme, imageUrl, amountLabel, code, caption, minHeight };

  const flip = () => {
    const next = !flipped;
    setFlipped(next);
    Animated.timing(spin, {
      toValue: next ? 1 : 0,
      duration: FLIP_MS,
      useNativeDriver: true,
    }).start();
  };

  const frontRotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  if (!canFlip) {
    return <GiftCardFace side="FRONT" artworkUrl={artwork.front} testID={testID} {...faceProps} />;
  }

  return (
    <YStack position="relative">
      <Animated.View
        style={{
          backfaceVisibility: 'hidden',
          transform: [{ perspective: 1000 }, { rotateY: frontRotate }],
        }}
      >
        <GiftCardFace side="FRONT" artworkUrl={artwork.front} testID={testID} {...faceProps} />
      </Animated.View>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backfaceVisibility: 'hidden',
            transform: [{ perspective: 1000 }, { rotateY: backRotate }],
          },
        ]}
      >
        <GiftCardFace side="BACK" fill artworkUrl={artwork.back} {...faceProps} />
      </Animated.View>
      <XStack
        testID="gift-card-flip"
        role="button"
        aria-label={t('mweb.giftCards.flipCard')}
        onPress={flip}
        position="absolute"
        right={10}
        bottom={10}
        zIndex={2}
        width={32}
        height={32}
        borderRadius={16}
        alignItems="center"
        justifyContent="center"
        backgroundColor="rgba(0,0,0,0.35)"
        pressStyle={PRESS_STYLE.row}
      >
        <MaterialIcons name="flip" size={18} color="#ffffff" />
      </XStack>
    </YStack>
  );
}
