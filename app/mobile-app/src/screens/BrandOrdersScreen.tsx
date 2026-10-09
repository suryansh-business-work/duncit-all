import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { BrandOrderRow } from '@/components/brand-orders/BrandOrderRow';
import { BrandOrdersFilters } from '@/components/brand-orders/BrandOrdersFilters';
import { DuncitButton } from '@/components/DuncitButton';
import { EmptyState } from '@/components/EmptyState';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useBrandOrders } from '@/hooks/useBrandOrders';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

/**
 * Brand Studio → Brand Orders (/products/orders): the Pod Shop orders of the
 * partner's own brands, newest first, a page at a time — searchable by order
 * no., buyer or AWB and filterable by status. Pressing an order opens it.
 * mWeb twin: pages/brand-orders-page.
 */
export function BrandOrdersScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const desk = useBrandOrders();

  let body;
  if (desk.isLoading && desk.rows.length === 0) {
    body = (
      <Spinner
        role="progressbar"
        aria-label={t('mweb.a11y.loading')}
        color="$primary"
        testID="brand-orders-loading"
      />
    );
  } else if (desk.error && desk.rows.length === 0) {
    body = (
      <YStack gap={12} alignItems="flex-start" testID="brand-orders-error">
        <Text role="alert" fontSize={13} color="$danger">
          {desk.error}
        </Text>
        <DuncitButton
          label={t('mweb.brandOrders.retry')}
          variant="outline"
          size="sm"
          testID="brand-orders-retry"
          onPress={desk.retry}
        />
      </YStack>
    );
  } else if (desk.rows.length === 0) {
    body = (
      <EmptyState
        testID="brand-orders-empty"
        icon="local-shipping"
        title={t(desk.filtered ? 'mweb.brandOrders.emptyFiltered' : 'mweb.brandOrders.empty')}
      />
    );
  } else {
    body = (
      <YStack gap={12}>
        <SurfaceCard testID="brand-orders-list" padding={0} paddingVertical={4} overflow="hidden">
          {desk.rows.map((order, index) => (
            <YStack key={order.id} borderTopWidth={index === 0 ? 0 : 1} borderColor="$borderColor">
              <BrandOrderRow
                order={order}
                onOpen={() => navigation.navigate('BrandOrderDetail', { id: order.id })}
              />
            </YStack>
          ))}
        </SurfaceCard>
        {desk.pages > 1 ? (
          <XStack
            alignItems="center"
            justifyContent="space-between"
            gap={8}
            testID="brand-orders-pager"
          >
            <DuncitButton
              label={t('mweb.brandOrders.previousPage')}
              variant="outline"
              size="sm"
              disabled={desk.page <= 1}
              testID="brand-orders-prev"
              onPress={() => desk.setPage(desk.page - 1)}
            />
            <Text fontSize={13} color="$muted" testID="brand-orders-page-of">
              {t('mweb.brandOrders.pageOf', { vars: { page: desk.page, pages: desk.pages } })}
            </Text>
            <DuncitButton
              label={t('mweb.brandOrders.nextPage')}
              variant="outline"
              size="sm"
              disabled={desk.page >= desk.pages}
              testID="brand-orders-next"
              onPress={() => desk.setPage(desk.page + 1)}
            />
          </XStack>
        ) : null}
      </YStack>
    );
  }

  return (
    <StackScreen title={t('mweb.studioOptions.brandOrders')} testID="brand-orders-screen">
      <RefreshScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        <YStack gap={16}>
          <BrandOrdersFilters
            search={desk.search}
            status={desk.status}
            onSearch={desk.setSearch}
            onStatus={desk.setStatus}
          />
          {body}
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}
