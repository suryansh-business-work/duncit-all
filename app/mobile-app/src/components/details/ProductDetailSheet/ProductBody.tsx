import { Text, XStack, YStack } from 'tamagui';

import { ProductQuantityBar } from '@/components/details/ProductQuantityBar';
import { ProductReviews } from '@/components/details/ProductReviews';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { formatRupees, productSpecs } from '@/utils/product-specs';
import { BrandPill, ProductGallery, ProductInfoCard, VariantChips } from './parts';
import type { Product, Variant } from './types';

const SHADOW_OFFSET = { width: 0, height: 8 };

export interface BodyProps {
  product: Product | null;
  variants: Variant[];
  selectedVariantId: string | null;
  onSelectVariant: (id: string) => void;
  images: string[];
  price: number;
  mrp: number;
  hasMrp: boolean;
  brandId: string | null;
  selectedVariant: Variant | null;
  quantity: number;
  maxQuantity: number;
  primary: string;
  readOnly?: boolean;
  onUpdateQuantity?: (quantity: number) => void;
  onZoom: (index: number) => void;
  onOpenBrand: (brandId: string) => void;
}

/**
 * The loaded product, as mWeb's product page lays it out: the gallery, name and
 * price, the variant and brand pills, the description card and the reviews —
 * with the add / quantity control in a bottom bar beside the price. Renders
 * nothing until the product has arrived.
 */
export function ProductBody({
  product,
  variants,
  selectedVariantId,
  onSelectVariant,
  images,
  price,
  mrp,
  hasMrp,
  brandId,
  selectedVariant,
  quantity,
  maxQuantity,
  primary,
  readOnly,
  onUpdateQuantity,
  onZoom,
  onOpenBrand,
}: Readonly<BodyProps>) {
  if (!product) return null;
  const description = product.description || product.short_description;
  // Specs reflect the selected variant's colour/size when one is chosen.
  const specs = productSpecs(selectedVariant ? { ...product, ...selectedVariant } : product);
  // The bar only exists while there is something to buy with it.
  const canBuy = !readOnly && !!onUpdateQuantity;

  return (
    <YStack flex={1}>
      <RefreshScrollView paddingHorizontal={16}>
        <YStack gap={16} paddingBottom={24}>
          {images.length > 0 ? <ProductGallery images={images} onZoom={onZoom} /> : null}
          <YStack gap={6}>
            <Text testID="product-detail-name" fontSize={22} fontWeight="600" color="$color">
              {product.product_name}
            </Text>
            <XStack alignItems="baseline" gap={8}>
              <Text testID="product-detail-price" fontSize={20} fontWeight="700" color="$color">
                {formatRupees(price)}
              </Text>
              {hasMrp ? (
                <Text fontSize={13} color="$muted" textDecorationLine="line-through">
                  {formatRupees(mrp)}
                </Text>
              ) : null}
            </XStack>
          </YStack>
          <VariantChips
            variants={variants}
            selectedVariantId={selectedVariantId}
            onSelectVariant={onSelectVariant}
          />
          {product.brand_name ? (
            <BrandPill brandId={brandId} brandName={product.brand_name} onOpenBrand={onOpenBrand} />
          ) : null}
          <ProductInfoCard description={description || 'No description provided.'} specs={specs} />
          <ProductReviews productId={product.id} />
        </YStack>
      </RefreshScrollView>
      {canBuy ? (
        <XStack
          alignItems="center"
          gap={16}
          marginHorizontal={16}
          marginBottom={8}
          padding={10}
          paddingLeft={16}
          borderRadius={24}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$surface"
          shadowColor="#000000"
          shadowOpacity={0.12}
          shadowRadius={16}
          shadowOffset={SHADOW_OFFSET}
        >
          <Text fontSize={18} fontWeight="700" color="$color">
            {formatRupees(price)}
          </Text>
          <YStack flex={1}>
            <ProductQuantityBar
              quantity={quantity}
              maxQuantity={maxQuantity}
              primary={primary}
              readOnly={readOnly}
              onUpdate={onUpdateQuantity}
            />
          </YStack>
        </XStack>
      ) : null}
    </YStack>
  );
}
