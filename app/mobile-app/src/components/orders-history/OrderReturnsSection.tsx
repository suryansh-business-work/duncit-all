import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { openReturnLines, returnDeadline } from '@/utils/pod-shop-returns';
import type { HistoryOrder, PodShopReturn } from '@/utils/product-orders';
import { PodShopReturnCard } from './PodShopReturnCard';

interface Props {
  order: HistoryOrder;
  returns: readonly PodShopReturn[];
  onReturn: (order: HistoryOrder) => void;
  onCancelReturn: (ret: PodShopReturn) => void;
}

/** Under an order: "Return items" while anything can still go back (with the
 * deadline), then every return already asked for. Renders nothing when there
 * is neither. mWeb twin: pages/orders-history-page/OrderReturnsSection. */
export function OrderReturnsSection({ order, returns, onReturn, onCancelReturn }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const { primary } = useThemeColors();
  const canReturn = openReturnLines(order.returnable).length > 0;
  const deadline = returnDeadline(order.returnable);

  if (!canReturn && returns.length === 0) return null;

  return (
    <YStack gap={8} testID={`order-returns-${order.id}`}>
      {canReturn ? (
        <XStack gap={8} alignItems="center" flexWrap="wrap">
          <DuncitButton
            label={t('mweb.podShopReturns.returnItems')}
            variant="outline"
            size="sm"
            icon={<MaterialIcons name="assignment-return" size={16} color={primary} />}
            testID={`order-return-items-${order.id}`}
            onPress={() => onReturn(order)}
          />
          {deadline ? (
            <Text testID={`order-return-by-${order.id}`} fontSize={11} color="$muted">
              {t('mweb.podShopReturns.returnBy', { vars: { date: formatDate(deadline) } })}
            </Text>
          ) : null}
        </XStack>
      ) : null}
      {returns.length > 0 ? (
        <YStack gap={8}>
          <Text fontSize={11} fontWeight="600" color="$muted" textTransform="uppercase">
            {t('mweb.podShopReturns.sectionTitle')}
          </Text>
          {returns.map((ret) => (
            <PodShopReturnCard
              key={ret.id}
              ret={ret}
              currencySymbol={order.currency_symbol}
              onCancel={onCancelReturn}
            />
          ))}
        </YStack>
      ) : null}
    </YStack>
  );
}
