import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, XStack, YStack } from 'tamagui';

import { GiftCardScopeType } from '@/generated/graphql/graphql';
import { useTranslation } from '@/hooks/useTranslation';
import { giftCardGradient, type GiftCardTheme } from '@/utils/gift-cards';

const INK = '#ffffff';
const INK_SOFT = 'rgba(255,255,255,0.85)';
/** Sits under the copy so white text stays readable over any uploaded photo. */
const SCRIM: readonly [string, string, string] = [
  'rgba(0,0,0,0.45)',
  'rgba(0,0,0,0.10)',
  'rgba(0,0,0,0.60)',
];

/** Which side of the card this is. The front carries the value; the back is the
 * reverse an admin uploads artwork for, so it never repeats the amount. */
export type GiftCardFaceSide = 'FRONT' | 'BACK';

export interface GiftCardFaceProps {
  side: GiftCardFaceSide;
  theme: GiftCardTheme;
  /** Category icon shown top-right on a gradient face; artwork replaces it. */
  imageUrl: string;
  /** This face's uploaded artwork; empty falls back to the gradient design. */
  artworkUrl: string;
  amountLabel?: string;
  code?: string;
  caption?: string;
  minHeight?: number;
  /** Stretch to the parent instead of sizing to content. The flipped-away face
   * is absolutely positioned, so only it needs to fill; the in-flow face keeps
   * its content height exactly as the card has always sized itself. */
  fill?: boolean;
  testID?: string;
}

/**
 * ONE side of the gift card. With artwork it renders the uploaded image full
 * bleed under a scrim; without it, the generated gradient card the feature has
 * always drawn. An artwork URL that fails to load falls back to the gradient,
 * so a deleted upload never leaves a blank card behind. Twin of mWeb's
 * GiftCardFace (rule 27).
 */
export function GiftCardFace({
  side,
  theme,
  imageUrl,
  artworkUrl,
  amountLabel,
  code,
  caption,
  minHeight = 120,
  fill = false,
  testID,
}: Readonly<GiftCardFaceProps>) {
  const { t } = useTranslation();
  const [artworkFailed, setArtworkFailed] = useState(false);
  const [iconFailed, setIconFailed] = useState(false);
  const [start, end] = giftCardGradient(theme);
  const isShop = theme.scope_type === GiftCardScopeType.Shop;
  const title = isShop ? t('mweb.giftCards.shopTheme') : theme.scope_name;
  const showArtwork = !!artworkUrl && !artworkFailed;
  const showIcon = !showArtwork && !!imageUrl && !iconFailed;
  const isFront = side === 'FRONT';

  return (
    <LinearGradient
      colors={[start, end]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ borderRadius: 16, overflow: 'hidden' }, fill ? { flex: 1 } : null]}
    >
      {showArtwork ? (
        <>
          <Image
            source={{ uri: artworkUrl }}
            accessibilityLabel={
              isFront ? t('mweb.giftCards.cardFront') : t('mweb.giftCards.cardBack')
            }
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            onError={() => setArtworkFailed(true)}
          />
          <LinearGradient colors={[...SCRIM]} style={StyleSheet.absoluteFill} />
        </>
      ) : null}
      <YStack
        testID={testID}
        flex={fill ? 1 : undefined}
        padding={14}
        minHeight={minHeight}
        justifyContent="space-between"
      >
        <XStack alignItems="center" justifyContent="space-between" gap={10}>
          <YStack flex={1} gap={2}>
            <Text color={INK} fontSize={14} fontWeight="700" numberOfLines={1}>
              {title}
            </Text>
            {caption ? (
              <Text color={INK_SOFT} fontSize={11} numberOfLines={2}>
                {caption}
              </Text>
            ) : null}
          </YStack>
          {showIcon ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: 34, height: 34, borderRadius: 8 }}
              contentFit="cover"
              onError={() => setIconFailed(true)}
            />
          ) : null}
        </XStack>
        <YStack gap={4} paddingTop={10}>
          {isFront && amountLabel ? (
            <Text color={INK} fontSize={24} fontWeight="800">
              {amountLabel}
            </Text>
          ) : null}
          {code ? (
            <Text color={INK_SOFT} fontSize={13} fontWeight="700" letterSpacing={1.2}>
              {code}
            </Text>
          ) : null}
        </YStack>
      </YStack>
    </LinearGradient>
  );
}
