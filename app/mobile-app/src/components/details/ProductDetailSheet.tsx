import { useEffect, useState } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { PublicInventoryProductDocument } from '@/graphql/details';
import { graphqlRequest } from '@/services/graphql.client';
import { useThemeColors } from '@/hooks/useThemeColors';
import { toErrorMessage } from '@/utils/errors';

type Product = NonNullable<
  ResultOf<typeof PublicInventoryProductDocument>['publicInventoryProduct']
>;

interface Props {
  productId: string | null;
  onClose: () => void;
}

/** Product-detail bottom sheet opened from the Pod Shop info icon — image
 * gallery, name, brand and description, fetched on demand for any signed-in
 * user (RN twin of mWeb's ProductDetailDialog). */
export function ProductDetailSheet({ productId, onClose }: Readonly<Props>) {
  const { primary } = useThemeColors();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!productId) return;
    let active = true;
    setIsLoading(true);
    setError('');
    setProduct(null);
    graphqlRequest(PublicInventoryProductDocument, { productDocId: productId }, { auth: true })
      .then((data) => active && setProduct(data.publicInventoryProduct ?? null))
      .catch((e) => active && setError(toErrorMessage(e, 'Could not load product.')))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [productId]);

  const images = product
    ? product.images.length > 0
      ? product.images
      : [product.image_url].filter(Boolean)
    : [];
  const description = product ? product.description || product.short_description : '';

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
              ) : error ? (
                <Text testID="product-detail-error" padding={24} color="$danger">
                  {error}
                </Text>
              ) : product ? (
                <ScrollView paddingHorizontal={16}>
                  <YStack gap={12} paddingBottom={12}>
                    {images.length > 0 ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <XStack gap={10}>
                          {images.map((url) => (
                            <AppImage
                              key={url}
                              source={{ uri: url }}
                              style={{ width: 180, height: 180, borderRadius: 12 }}
                              resizeMode="cover"
                            />
                          ))}
                        </XStack>
                      </ScrollView>
                    ) : null}
                    <Text
                      testID="product-detail-name"
                      fontSize={18}
                      fontWeight="900"
                      color="$color"
                    >
                      {product.product_name}
                    </Text>
                    {product.brand_name ? (
                      <XStack gap={5} alignItems="center" testID="product-detail-brand">
                        <MaterialIcons name="storefront" size={15} color="#9aa0a6" />
                        <Text fontSize={13} fontWeight="700" color="$muted">
                          by {product.brand_name}
                        </Text>
                      </XStack>
                    ) : null}
                    <Text fontSize={13.5} color="$muted" lineHeight={20}>
                      {description || 'No description provided.'}
                    </Text>
                  </YStack>
                </ScrollView>
              ) : null}
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
