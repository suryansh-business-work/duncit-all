import { useRoute, type RouteProp } from '@react-navigation/native';
import { YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { ProductDetailSheet } from '@/components/details/ProductDetailSheet';
import { useGoBack } from '@/hooks/useGoBack';
import type { RootStackParamList } from '@/navigation/types';

/** Standalone product detail (Pod Shop browse → tap a product). Browse-only:
 * products are purchased through a pod's shop, so the sheet gets no selection
 * handlers — closing it returns to the shop. RN twin of mWeb's
 * ProductDetailPage. */
export function ProductDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'ProductDetail'>>();
  const goBack = useGoBack();
  return (
    <YStack flex={1} testID="product-detail-screen">
      <AppBackground />
      <ProductDetailSheet productId={route.params.productId} onClose={goBack} />
    </YStack>
  );
}
