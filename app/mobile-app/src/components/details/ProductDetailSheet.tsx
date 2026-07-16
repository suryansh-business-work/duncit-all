import { useEffect, useState } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { BrandDetailSheet } from '@/components/details/BrandDetailSheet';
import { ZoomableImageModal } from '@/components/details/ZoomableImageModal';
import { ProductQuantityBar } from '@/components/details/ProductQuantityBar';
import { ProductReviews } from '@/components/details/ProductReviews';
import { PublicInventoryProductDocument } from '@/graphql/details';
import { graphqlRequest } from '@/services/graphql.client';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatRupees, productSpecs, type ProductSpec } from '@/utils/product-specs';
import { toErrorMessage } from '@/utils/errors';

type Product = NonNullable<
  ResultOf<typeof PublicInventoryProductDocument>['publicInventoryProduct']
>;
type Variant = Product['variants'][number];

interface Props {
  productId: string | null;
  onClose: () => void;
  /** Current selected quantity of this product (from the pod's selection map). */
  quantity?: number;
  /** Available stock — the sheet's own query does not return it, so the pod row passes it. */
  maxQuantity?: number;
  /** Update the selection for this product; 0 removes it. */
  onUpdateQuantity?: (quantity: number) => void;
  /** View-only once the viewer has already booked this pod (no re-selecting). */
  readOnly?: boolean;
}

interface BodyProps {
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

/** The gallery: the selected variant's images, else the product's image list,
 * falling back to its single cover image. Shared with the pinch-zoom viewer. */
function productImages(product: Product | null, variant: Variant | null): string[] {
  const variantImages = variant?.images ?? [];
  if (variantImages.length > 0) return variantImages;
  if (!product) return [];
  const gallery = product.images;
  return gallery.length > 0 ? gallery : [product.image_url].filter(Boolean);
}

/** Colour/size variant chips — tapping one swaps the price, stock and images. */
function VariantChips({
  variants,
  selectedVariantId,
  primary,
  onSelectVariant,
}: Readonly<{
  variants: Variant[];
  selectedVariantId: string | null;
  primary: string;
  onSelectVariant: (id: string) => void;
}>) {
  if (variants.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <XStack gap={8}>
        {variants.map((v) => {
          const selected = v.id === selectedVariantId;
          return (
            <YStack
              key={v.id}
              testID={`variant-${v.id}`}
              role="button"
              onPress={() => onSelectVariant(v.id)}
              paddingHorizontal={12}
              paddingVertical={7}
              borderRadius={999}
              borderWidth={1}
              borderColor={selected ? primary : '$borderColor'}
              backgroundColor={selected ? primary : 'transparent'}
            >
              <Text fontSize={13} fontWeight="800" color={selected ? 'white' : '$color'}>
                {[v.option_label, v.color, v.size_label].find(Boolean) ?? 'Variant'}
              </Text>
            </YStack>
          );
        })}
      </XStack>
    </ScrollView>
  );
}

/** Horizontal image strip — tapping a thumbnail opens the pinch-zoom viewer. */
function ImageStrip({
  images,
  onZoom,
}: Readonly<{ images: string[]; onZoom: (index: number) => void }>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <XStack gap={10}>
        {images.map((url, imageIndex) => (
          <YStack
            key={url}
            testID={`product-detail-image-${imageIndex}`}
            role="button"
            aria-label="Zoom image"
            onPress={() => onZoom(imageIndex)}
          >
            <AppImage
              source={{ uri: url }}
              style={{ width: 180, height: 180, borderRadius: 12 }}
              resizeMode="cover"
            />
          </YStack>
        ))}
      </XStack>
    </ScrollView>
  );
}

/** Brand attribution — tappable (opens the brand sheet) only when the product
 * carries a brand link. */
function BrandRow({
  brandId,
  brandName,
  primary,
  onOpenBrand,
}: Readonly<{
  brandId: string | null;
  brandName: string;
  primary: string;
  onOpenBrand: (brandId: string) => void;
}>) {
  return (
    <XStack
      testID="product-detail-brand"
      role={brandId ? 'button' : undefined}
      aria-label={brandId ? `View ${brandName}` : undefined}
      onPress={brandId ? () => onOpenBrand(brandId) : undefined}
      gap={5}
      alignItems="center"
      pressStyle={brandId ? { opacity: 0.6 } : undefined}
    >
      <MaterialIcons name="storefront" size={15} color="#9aa0a6" />
      <Text fontSize={13} fontWeight="800" color={brandId ? '$primary' : '$muted'}>
        by {brandName}
      </Text>
      {brandId ? <MaterialIcons name="chevron-right" size={16} color={primary} /> : null}
    </XStack>
  );
}

/** Physical spec rows (size, colour, weight, dimensions) from the Product portal. */
function SpecGrid({ specs }: Readonly<{ specs: ProductSpec[] }>) {
  return (
    <YStack
      testID="product-detail-specs"
      gap={0}
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={12}
      overflow="hidden"
    >
      {specs.map((spec, specIndex) => (
        <XStack
          key={spec.label}
          justifyContent="space-between"
          paddingHorizontal={12}
          paddingVertical={10}
          borderTopWidth={specIndex === 0 ? 0 : 1}
          borderColor="$borderColor"
        >
          <Text fontSize={13} color="$muted" fontWeight="700">
            {spec.label}
          </Text>
          <Text fontSize={13} color="$color" fontWeight="800">
            {spec.value}
          </Text>
        </XStack>
      ))}
    </YStack>
  );
}

/** The loaded product: gallery, name, price, brand, description, specs and the
 * quantity bar. Renders nothing until the product has arrived. */
function ProductBody({
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

  return (
    <ScrollView paddingHorizontal={16}>
      <YStack gap={12} paddingBottom={12}>
        {images.length > 0 ? <ImageStrip images={images} onZoom={onZoom} /> : null}
        <Text testID="product-detail-name" fontSize={18} fontWeight="900" color="$color">
          {product.product_name}
        </Text>
        <XStack alignItems="baseline" gap={8}>
          <Text testID="product-detail-price" fontSize={20} fontWeight="900" color="$primary">
            {formatRupees(price)}
          </Text>
          {hasMrp ? (
            <Text fontSize={13} color="$muted" textDecorationLine="line-through">
              {formatRupees(mrp)}
            </Text>
          ) : null}
        </XStack>
        <VariantChips
          variants={variants}
          selectedVariantId={selectedVariantId}
          primary={primary}
          onSelectVariant={onSelectVariant}
        />
        {product.brand_name ? (
          <BrandRow
            brandId={brandId}
            brandName={product.brand_name}
            primary={primary}
            onOpenBrand={onOpenBrand}
          />
        ) : null}
        <Text fontSize={13.5} color="$muted" lineHeight={20}>
          {description || 'No description provided.'}
        </Text>
        {specs.length > 0 ? <SpecGrid specs={specs} /> : null}
        <ProductQuantityBar
          quantity={quantity}
          maxQuantity={maxQuantity}
          primary={primary}
          readOnly={readOnly}
          onUpdate={onUpdateQuantity}
        />
        <ProductReviews productId={product.id} />
      </YStack>
    </ScrollView>
  );
}

/** Product-detail bottom sheet opened from the Pod Shop info icon — image
 * gallery, name, brand and description, fetched on demand for any signed-in
 * user (RN twin of mWeb's ProductDetailDialog). */
export function ProductDetailSheet({
  productId,
  onClose,
  quantity = 0,
  maxQuantity = 0,
  onUpdateQuantity,
  readOnly,
}: Readonly<Props>) {
  const { primary } = useThemeColors();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [brandOpen, setBrandOpen] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    let active = true;
    setIsLoading(true);
    setError('');
    setProduct(null);
    setVariantId(null);
    graphqlRequest(PublicInventoryProductDocument, { productDocId: productId }, { auth: true })
      .then((data) => active && setProduct(data.publicInventoryProduct ?? null))
      .catch((e) => active && setError(toErrorMessage(e, 'Could not load product.')))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [productId]);

  const variants = product?.variants ?? [];
  const selectedVariant = variants.find((v) => v.id === variantId) ?? variants[0] ?? null;
  const images = productImages(product, selectedVariant);
  const price = selectedVariant?.unit_cost ?? product?.unit_cost ?? 0;
  const mrp = product?.selling_price ?? 0;
  const hasMrp = mrp > price;
  // Non-empty only when the product carries a brand link → the brand is tappable.
  const brandId = product?.brand_id ?? null;
  const stock = selectedVariant ? selectedVariant.inventory_count : maxQuantity;

  // Body variants hoisted to consts so the render tree keeps flat (non-nested)
  // ternaries — identical branches, same scope.
  const loadedBody = error ? (
    <Text testID="product-detail-error" padding={24} color="$danger">
      {error}
    </Text>
  ) : (
    <ProductBody
      product={product}
      variants={variants}
      selectedVariantId={selectedVariant?.id ?? null}
      onSelectVariant={setVariantId}
      images={images}
      price={price}
      mrp={mrp}
      hasMrp={hasMrp}
      brandId={brandId}
      selectedVariant={selectedVariant}
      quantity={quantity}
      maxQuantity={stock}
      primary={primary}
      readOnly={readOnly}
      onUpdateQuantity={onUpdateQuantity}
      onZoom={setZoomIndex}
      onOpenBrand={setBrandOpen}
    />
  );

  return (
    <Modal visible={!!productId} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} justifyContent="flex-end" testID="product-detail-sheet">
          <YStack
            role="button"
            aria-label="Close"
            onPress={onClose}
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            backgroundColor="rgba(0,0,0,0.5)"
          />
          <YStack
            backgroundColor="$background"
            borderTopLeftRadius={22}
            borderTopRightRadius={22}
            maxHeight="86%"
          >
            <SafeAreaView edges={['bottom']}>
              <XStack alignItems="center" justifyContent="space-between" padding={16}>
                <Text fontSize={17} fontWeight="900" color="$color">
                  Product details
                </Text>
                <XStack
                  testID="product-detail-close"
                  role="button"
                  aria-label="Close"
                  onPress={onClose}
                  width={32}
                  height={32}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={16}
                  backgroundColor="$surface"
                >
                  <MaterialIcons name="close" size={18} color={primary} />
                </XStack>
              </XStack>

              {isLoading ? (
                <YStack padding={32} alignItems="center">
                  <Spinner testID="product-detail-loading" color="$primary" />
                </YStack>
              ) : (
                loadedBody
              )}
            </SafeAreaView>
          </YStack>
        </YStack>
        <ZoomableImageModal images={images} index={zoomIndex} onClose={() => setZoomIndex(null)} />
        <BrandDetailSheet brandId={brandOpen} onClose={() => setBrandOpen(null)} />
      </ModalThemeScope>
    </Modal>
  );
}
