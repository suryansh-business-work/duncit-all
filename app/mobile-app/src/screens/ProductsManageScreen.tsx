import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { SimpleBarChart } from '@/components/SimpleBarChart';
import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useEcommDashboard } from '@/hooks/useStudioDashboards';
import { StatTile } from '@/components/studio';
import { useTranslation } from '@/hooks/useTranslation';
import { RefreshScrollView } from '@/components/PullToRefresh';

/** ecomm studio dashboard — catalogue stats + stock-by-product chart (B3-1). */
export function ProductsManageScreen() {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const showProducts = useFeatureFlag('is_product_visible');
  const { products, isLoading } = useEcommDashboard(showProducts);
  if (!showProducts) {
    return (
      <StackScreen
        header
        title={t('mweb.productsManage.ecommStudio')}
        testID="products-manage-screen"
      >
        <YStack padding={16}>
          <Text testID="products-unavailable" fontSize={14} color="$muted">
            Product features are not available right now.
          </Text>
        </YStack>
      </StackScreen>
    );
  }
  const totalStock = products.reduce((sum, p) => sum + (p.available_count ?? 0), 0);
  const avgPrice = products.length
    ? Math.round(products.reduce((sum, p) => sum + (p.unit_cost ?? 0), 0) / products.length)
    : 0;
  const stockChart = products
    .slice()
    .sort((a, b) => (b.available_count ?? 0) - (a.available_count ?? 0))
    .slice(0, 6)
    .map((p) => ({ label: String(p.product_name).slice(0, 8), value: p.available_count ?? 0 }));

  return (
    <StackScreen
      header
      title={t('mweb.productsManage.ecommStudio')}
      testID="products-manage-screen"
    >
      <RefreshScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={16} padding={16} paddingBottom={48}>
          {isLoading ? <Spinner testID="ecomm-dashboard-loading" color="$primary" /> : null}
          <XStack gap={10}>
            <StatTile label={t('mweb.productsManage.products')} value={products.length} />
            <StatTile label={t('mweb.productsManage.inStock')} value={totalStock} />
            <StatTile label={t('mweb.productsManage.avgPrice')} value={`₹${avgPrice}`} />
          </XStack>
          <SurfaceCard gap={8}>
            <Text fontSize={16} fontWeight="600" color="$color">
              Stock by product
            </Text>
            {stockChart.length === 0 ? (
              <YStack alignItems="center" gap={10} paddingVertical={16}>
                <MaterialIcons name="inventory-2" size={48} color={muted} />
                <Text
                  testID="ecomm-dashboard-empty"
                  fontSize={14}
                  color="$muted"
                  textAlign="center"
                >
                  No products in the catalogue yet.
                </Text>
              </YStack>
            ) : (
              <SimpleBarChart testID="ecomm-stock-chart" data={stockChart} />
            )}
          </SurfaceCard>
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}
