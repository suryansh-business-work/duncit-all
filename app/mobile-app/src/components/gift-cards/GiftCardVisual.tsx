import { useState } from 'react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, XStack, YStack } from 'tamagui';

import { GiftCardScopeType } from '@/generated/graphql/graphql';
import { useTranslation } from '@/hooks/useTranslation';
import { giftCardGradient, type GiftCardTheme } from '@/utils/gift-cards';

const INK = '#ffffff';
const INK_SOFT = 'rgba(255,255,255,0.85)';

export interface GiftCardVisualProps {
  theme: GiftCardTheme;
  /** Category icon overlaid top-right; hidden when empty or it fails to load. */
  imageUrl: string;
  /** Formatted face value ("₹500.00") shown large; omitted while unpicked. */
  amountLabel?: string;
  /** Redemption code — printed on owned cards only. */
  code?: string;
  /** Second line under the title (e.g. the Pod Shop caption on the picker). */
  caption?: string;
  minHeight?: number;
  testID?: string;
}

/**
 * The gift card itself — a rounded gradient card whose colors are picked
 * deterministically from the theme, with the scope image, the scope name (the
 * localized Pod Shop label for SHOP cards), the amount large, and the code.
 * One visual for the picker, My cards, checkout and redeem (rule 34); mWeb
 * renders the identical card (rule 27).
 */
export function GiftCardVisual({
  theme,
  imageUrl,
  amountLabel,
  code,
  caption,
  minHeight = 120,
  testID,
}: Readonly<GiftCardVisualProps>) {
  const { t } = useTranslation();
  const [imageFailed, setImageFailed] = useState(false);
  const [start, end] = giftCardGradient(theme);
  const isShop = theme.scope_type === GiftCardScopeType.Shop;
  const title = isShop ? t('mweb.giftCards.shopTheme') : theme.scope_name;
  const showImage = !!imageUrl && !imageFailed;

  return (
    <LinearGradient
      colors={[start, end]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 16, overflow: 'hidden' }}
    >
      <YStack testID={testID} padding={14} minHeight={minHeight} justifyContent="space-between">
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
          {showImage ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: 34, height: 34, borderRadius: 8 }}
              contentFit="cover"
              onError={() => setImageFailed(true)}
            />
          ) : null}
        </XStack>
        <YStack gap={4} paddingTop={10}>
          {amountLabel ? (
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
