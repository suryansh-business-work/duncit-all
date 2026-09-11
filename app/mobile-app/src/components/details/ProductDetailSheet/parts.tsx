import { useWindowDimensions } from 'react-native';
import { ScrollView, Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import type { ProductSpec } from '@/utils/product-specs';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { variantLabel, type Variant } from './types';

/** The sheet's side padding — the gallery sits inside it. */
const GUTTER = 16;
const SLIDE_GAP = 8;

/** Colour/size variant pills — tapping one swaps the price, stock and images.
 * Selected is the green pill; the rest are surface pills. */
export function VariantChips({
  variants,
  selectedVariantId,
  onSelectVariant,
}: Readonly<{
  variants: Variant[];
  selectedVariantId: string | null;
  onSelectVariant: (id: string) => void;
}>) {
  if (variants.length === 0) return null;
  return (
    <XStack gap={8} flexWrap="wrap">
      {variants.map((v) => {
        const selected = v.id === selectedVariantId;
        return (
          <XStack
            pressStyle={PRESS_STYLE.control}
            key={v.id}
            testID={`variant-${v.id}`}
            role="button"
            onPress={() => onSelectVariant(v.id)}
            alignItems="center"
            height={36}
            paddingHorizontal={14}
            borderRadius={999}
            backgroundColor={selected ? '$primary' : '$surface'}
          >
            <Text fontSize={13} fontWeight="600" color={selected ? '$onPrimary' : '$color'}>
              {variantLabel(v)}
            </Text>
          </XStack>
        );
      })}
    </XStack>
  );
}

/** The product's hero carousel: square 24px-corner slides that snap one at a
 * time (the next one peeks when there are several). Tapping a slide opens the
 * pinch-zoom viewer. mWeb twin: product-detail-page/ProductGallery. */
export function ProductGallery({
  images,
  onZoom,
}: Readonly<{ images: string[]; onZoom: (index: number) => void }>) {
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const full = windowWidth - GUTTER * 2;
  const slide = images.length > 1 ? Math.round(full * 0.86) : full;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={slide + SLIDE_GAP}
      decelerationRate="fast"
    >
      <XStack gap={SLIDE_GAP}>
        {images.map((url, imageIndex) => (
          <YStack
            pressStyle={PRESS_STYLE.surface}
            key={url}
            testID={`product-detail-image-${imageIndex}`}
            role="button"
            aria-label={t('mweb.common.zoomImage')}
            onPress={() => onZoom(imageIndex)}
            width={slide}
            height={slide}
            borderRadius={24}
            overflow="hidden"
            backgroundColor="$soft"
          >
            <AppImage
              source={{ uri: url }}
              style={{ width: slide, height: slide }}
              resizeMode="cover"
            />
          </YStack>
        ))}
      </XStack>
    </ScrollView>
  );
}

/** Brand attribution as a surface pill — tappable (opens the brand sheet) only
 * when the product carries a brand link. */
export function BrandPill({
  brandId,
  brandName,
  onOpenBrand,
}: Readonly<{
  brandId: string | null;
  brandName: string;
  onOpenBrand: (brandId: string) => void;
}>) {
  return (
    <XStack
      testID="product-detail-brand"
      role={brandId ? 'button' : undefined}
      aria-label={brandId ? `View ${brandName}` : undefined}
      onPress={brandId ? () => onOpenBrand(brandId) : undefined}
      alignSelf="flex-start"
      alignItems="center"
      height={36}
      paddingHorizontal={14}
      borderRadius={999}
      backgroundColor="$surface"
      pressStyle={brandId ? PRESS_STYLE.control : undefined}
    >
      <Text fontSize={13} fontWeight="600" color="$color">
        by {brandName}
      </Text>
    </XStack>
  );
}

/** The description card: the product copy, then its physical spec rows (label
 * muted, value ink) under hairline dividers. mWeb twin: ProductInfoCard. */
export function ProductInfoCard({
  description,
  specs,
}: Readonly<{ description: string; specs: ProductSpec[] }>) {
  return (
    <SurfaceCard gap={12}>
      <Text fontSize={14} color="$muted" lineHeight={21}>
        {description}
      </Text>
      {specs.length > 0 ? (
        <YStack testID="product-detail-specs">
          {specs.map((spec) => (
            <XStack
              key={spec.label}
              justifyContent="space-between"
              gap={16}
              paddingVertical={10}
              borderTopWidth={1}
              borderColor="$borderColor"
            >
              <Text fontSize={13} color="$muted">
                {spec.label}
              </Text>
              <Text fontSize={13} color="$color" fontWeight="600" textAlign="right">
                {spec.value}
              </Text>
            </XStack>
          ))}
        </YStack>
      ) : null}
    </SurfaceCard>
  );
}
