import { Linking, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { partnerPortalUrl } from '@duncit/onboarding';

import { ChoiceChip } from '@/components/brand-orders/ChoiceChip';
import { WarehouseRow } from '@/components/brand-orders/WarehouseRow';
import { DuncitButton } from '@/components/DuncitButton';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useBrandWarehouses } from '@/hooks/useBrandWarehouses';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

/** The Partner console's warehouse desk, where warehouses are added and edited. */
const MANAGE_PATH = '/ecomm-brand/warehouses';

/**
 * Brand Studio → ShipRocket Warehouses (/products/warehouses): a brand's pickup
 * addresses with their review and ShipRocket standing, and a sync that checks
 * them against ShipRocket. Adding and editing stay in the Partner app.
 * mWeb twin: pages/brand-warehouses-page.
 */
export function BrandWarehousesScreen() {
  const { t } = useTranslation();
  const { color, onPrimary } = useThemeColors();
  const desk = useBrandWarehouses();
  const result = desk.outcome;

  let body;
  if (desk.isLoading && desk.warehouses.length === 0) {
    body = (
      <Spinner
        role="progressbar"
        aria-label={t('mweb.a11y.loading')}
        color="$primary"
        testID="brand-warehouses-loading"
      />
    );
  } else if (desk.error && desk.warehouses.length === 0) {
    body = (
      <YStack gap={12} alignItems="flex-start" testID="brand-warehouses-error">
        <Text role="alert" fontSize={13} color="$danger">
          {desk.error}
        </Text>
        <DuncitButton
          label={t('mweb.brandWarehouses.retry')}
          variant="outline"
          size="sm"
          testID="brand-warehouses-retry"
          onPress={desk.retry}
        />
      </YStack>
    );
  } else if (!desk.brandId) {
    body = (
      <Text role="status" fontSize={14} color="$muted" testID="brand-warehouses-no-brands">
        {t('mweb.brandWarehouses.noBrands')}
      </Text>
    );
  } else if (desk.warehouses.length === 0) {
    body = (
      <Text role="status" fontSize={14} color="$muted" testID="brand-warehouses-empty">
        {t('mweb.brandWarehouses.empty')}
      </Text>
    );
  } else {
    body = (
      <SurfaceCard testID="brand-warehouses-list" padding={0} paddingVertical={4} overflow="hidden">
        {desk.warehouses.map((w, index) => (
          <YStack key={w.id} borderTopWidth={index === 0 ? 0 : 1} borderColor="$borderColor">
            <WarehouseRow warehouse={w} />
          </YStack>
        ))}
      </SurfaceCard>
    );
  }

  let said = null;
  if (desk.syncError) {
    said = (
      <Text role="alert" fontSize={13} color="$danger" testID="brand-warehouses-sync-error">
        {desk.syncError}
      </Text>
    );
  } else if (result?.shiprocket_error) {
    said = (
      <Text role="alert" fontSize={13} color="$danger" testID="brand-warehouses-sync-error">
        {t('mweb.brandWarehouses.syncFailed', { vars: { error: result.shiprocket_error } })}
      </Text>
    );
  } else if (result) {
    said = (
      <Text role="status" fontSize={13} color="$success" testID="brand-warehouses-synced">
        {t('mweb.brandWarehouses.synced')}
        {result.adopted > 0
          ? ` ${t('mweb.brandWarehouses.adopted', { count: result.adopted, vars: { count: result.adopted } })}`
          : ''}
      </Text>
    );
  }

  return (
    <StackScreen title={t('mweb.studioOptions.brandWarehouses')} testID="brand-warehouses-screen">
      <RefreshScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        <YStack gap={16}>
          {desk.brands.length > 1 ? (
            <YStack gap={8}>
              <Text fontSize={12} fontWeight="600" color="$muted">
                {t('mweb.brandWarehouses.brand')}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <XStack gap={8}>
                  {desk.brands.map((b) => (
                    <ChoiceChip
                      key={b.id}
                      testID={`brand-warehouses-brand-${b.id}`}
                      label={b.brand_name}
                      active={b.id === desk.brandId}
                      onPress={() => desk.selectBrand(b.id)}
                    />
                  ))}
                </XStack>
              </ScrollView>
            </YStack>
          ) : null}
          {desk.brandId ? (
            <XStack gap={8} flexWrap="wrap">
              <DuncitButton
                label={t(
                  desk.syncing ? 'mweb.brandWarehouses.syncing' : 'mweb.brandWarehouses.sync',
                )}
                size="sm"
                loading={desk.syncing}
                icon={<MaterialIcons name="sync" size={16} color={onPrimary} />}
                testID="brand-warehouses-sync"
                onPress={() => fireAndForget(desk.sync())}
              />
              <DuncitButton
                label={t('mweb.brandWarehouses.manage')}
                variant="outline"
                size="sm"
                icon={<MaterialIcons name="open-in-new" size={16} color={color} />}
                testID="brand-warehouses-manage"
                onPress={() => fireAndForget(Linking.openURL(partnerPortalUrl(MANAGE_PATH)))}
              />
            </XStack>
          ) : null}
          {said}
          {body}
          <Text fontSize={12} color="$muted">
            {t('mweb.brandWarehouses.manageHint')}
          </Text>
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}
