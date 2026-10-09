import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { formatMoney, shipToLines } from '@duncit/utils';

import { AppImage } from '@/components/AppImage';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { BrandOrder } from '@/hooks/useBrandOrder';

/** The order's lines and its total, then where it ships to. RN twin of mWeb's BrandOrderItems. */
export function BrandOrderItems({ order }: Readonly<{ order: BrandOrder }>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const money = (amount: number) => formatMoney(amount, { symbol: order.currency_symbol });
  const to = order.shipping_address;
  return (
    <YStack gap={10}>
      <Text role="heading" fontSize={14} fontWeight="700" color="$color">
        {t('mweb.brandOrders.items')}
      </Text>
      {order.line_items.map((line) => (
        <XStack key={`${line.product_id}-${line.variant_id || 'base'}`} gap={8} alignItems="center">
          {line.image_url ? (
            <AppImage
              source={{ uri: line.image_url }}
              style={{ width: 36, height: 36, borderRadius: 8 }}
            />
          ) : (
            <YStack
              width={36}
              height={36}
              borderRadius={8}
              backgroundColor="$soft"
              alignItems="center"
              justifyContent="center"
            >
              <MaterialIcons name="shopping-bag" size={16} color={muted} />
            </YStack>
          )}
          <Text flex={1} fontSize={13} color="$color">
            {line.name}
            {line.variant_label ? ` — ${line.variant_label}` : ''} × {line.qty}
          </Text>
          <Text fontSize={13} fontWeight="600" color="$color">
            {money(line.gross)}
          </Text>
        </XStack>
      ))}
      <XStack
        justifyContent="space-between"
        borderTopWidth={1}
        borderColor="$borderColor"
        paddingTop={10}
      >
        <Text fontSize={14} fontWeight="700" color="$color">
          {t('mweb.brandOrders.total')}
        </Text>
        <Text fontSize={14} fontWeight="700" color="$color" testID="brand-order-total">
          {money(order.total)}
        </Text>
      </XStack>
      {order.fulfilment_method === 'SHIP' ? (
        <YStack gap={4} testID="brand-order-ship-to">
          <Text role="heading" fontSize={14} fontWeight="700" color="$color">
            {t('mweb.brandOrders.shipTo')}
          </Text>
          <Text fontSize={13} color="$muted">
            {to ? shipToLines(to).join('\n') : t('mweb.brandOrders.noShipTo')}
          </Text>
        </YStack>
      ) : null}
    </YStack>
  );
}
