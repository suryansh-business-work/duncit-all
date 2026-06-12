import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { SimpleBarChart } from '@/components/SimpleBarChart';
import { StackScreen } from '@/components/StackScreen';
import { useEcommDashboard } from '@/hooks/useStudioDashboards';
import { StatTile } from '@/screens/VenueManageScreen';

/** ecomm studio dashboard — catalogue stats + stock-by-product chart (B3-1). */
export function ProductsManageScreen() {
  const { products, isLoading } = useEcommDashboard();
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
    <StackScreen title="ecomm Studio" testID="products-manage-screen">
      <ScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={14} padding={16} paddingBottom={48}>
          {isLoading ? <Spinner testID="ecomm-dashboard-loading" color="$primary" /> : null}
          <XStack gap={10}>
            <StatTile label="Products" value={products.length} />
            <StatTile label="In stock" value={totalStock} />
            <StatTile label="Avg price" value={`₹${avgPrice}`} />
          </XStack>
          <YStack
            gap={4}
            padding={14}
            borderRadius={14}
            borderWidth={1}
            borderColor="$borderColor"
            backgroundColor="$surface"
          >
            <Text fontSize={15} fontWeight="900" color="$color">
              Stock by product
            </Text>
            <Text fontSize={11.5} color="$muted">
              Top {stockChart.length} products by available units
            </Text>
            {stockChart.length === 0 ? (
              <Text testID="ecomm-dashboard-empty" fontSize={13} color="$muted" paddingTop={6}>
                No products in the catalogue yet.
              </Text>
            ) : (
              <SimpleBarChart testID="ecomm-stock-chart" data={stockChart} />
            )}
          </YStack>
        </YStack>
      </ScrollView>
    </StackScreen>
  );
}
