import { useEffect, useState } from 'react';
import { Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { ModalThemeScope } from '@/components/ModalThemeScope';
import { PublicEcommBrandDocument } from '@/graphql/details';
import { graphqlRequest } from '@/services/graphql.client';
import { useThemeColors } from '@/hooks/useThemeColors';

type Brand = NonNullable<ResultOf<typeof PublicEcommBrandDocument>['publicEcommBrand']>;

/** Brand-detail bottom sheet opened by tapping the brand name in the product
 * sheet — logo/cover, tagline, description, categories and stats, fetched on
 * demand for any signed-in user (Task B item 1). */
export function BrandDetailSheet({
  brandId,
  onClose,
}: Readonly<{ brandId: string | null; onClose: () => void }>) {
  const { primary } = useThemeColors();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!brandId) return;
    setIsLoading(true);
    setBrand(null);
    graphqlRequest(PublicEcommBrandDocument, { brandDocId: brandId }, { auth: true })
      .then((data) => setBrand(data.publicEcommBrand ?? null))
      .catch(() => setBrand(null))
      .finally(() => setIsLoading(false));
  }, [brandId]);

  const location = brand ? [brand.city, brand.state].filter(Boolean).join(', ') : '';

  return (
    <Modal visible={!!brandId} transparent animationType="slide" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack flex={1} justifyContent="flex-end" testID="brand-detail-sheet">
          <YStack
            role="button"
            aria-label="Close brand"
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
            maxHeight="84%"
          >
            <SafeAreaView edges={['bottom']}>
              <XStack alignItems="center" justifyContent="space-between" padding={16}>
                <Text fontSize={17} fontWeight="900" color="$color">
                  Brand
                </Text>
                <XStack
                  testID="brand-detail-close"
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
                  <Spinner testID="brand-detail-loading" color="$primary" />
                </YStack>
              ) : brand ? (
                <ScrollView paddingHorizontal={16}>
                  <YStack gap={12} paddingBottom={16}>
                    {brand.cover_image_url ? (
                      <AppImage
                        source={{ uri: brand.cover_image_url }}
                        style={{ width: '100%', height: 128, borderRadius: 14 }}
                        resizeMode="cover"
                      />
                    ) : null}
                    <XStack gap={12} alignItems="center">
                      <YStack
                        width={54}
                        height={54}
                        borderRadius={14}
                        overflow="hidden"
                        backgroundColor="$surface"
                        alignItems="center"
                        justifyContent="center"
                      >
                        {brand.logo_url ? (
                          <AppImage
                            source={{ uri: brand.logo_url }}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        ) : (
                          <MaterialIcons name="storefront" size={24} color={primary} />
                        )}
                      </YStack>
                      <YStack flex={1}>
                        <Text
                          testID="brand-detail-name"
                          fontSize={18}
                          fontWeight="900"
                          color="$color"
                        >
                          {brand.brand_name}
                        </Text>
                        {brand.tagline ? (
                          <Text fontSize={13} color="$muted" fontWeight="700">
                            {brand.tagline}
                          </Text>
                        ) : null}
                      </YStack>
                    </XStack>
                    {brand.description ? (
                      <Text fontSize={13.5} color="$muted" lineHeight={20}>
                        {brand.description}
                      </Text>
                    ) : null}
                    <XStack flexWrap="wrap" gap={8}>
                      {location ? <BrandStat icon="place" label={location} /> : null}
                      {brand.established_year ? (
                        <BrandStat icon="event" label={`Since ${brand.established_year}`} />
                      ) : null}
                      <BrandStat
                        icon="inventory-2"
                        label={`${brand.approved_product_count} products`}
                      />
                    </XStack>
                  </YStack>
                </ScrollView>
              ) : (
                <Text testID="brand-detail-empty" padding={24} color="$muted">
                  Brand details are unavailable.
                </Text>
              )}
            </SafeAreaView>
          </YStack>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}

/** A small icon + label chip for a brand statistic. */
function BrandStat({
  icon,
  label,
}: Readonly<{ icon: 'place' | 'event' | 'inventory-2'; label: string }>) {
  return (
    <XStack
      alignItems="center"
      gap={5}
      paddingHorizontal={10}
      paddingVertical={6}
      borderRadius={999}
      backgroundColor="$surface"
    >
      <MaterialIcons name={icon} size={14} color="#9aa0a6" />
      <Text fontSize={12} fontWeight="700" color="$color">
        {label}
      </Text>
    </XStack>
  );
}
