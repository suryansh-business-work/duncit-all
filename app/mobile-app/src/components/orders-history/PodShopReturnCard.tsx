import { Text, XStack, YStack } from 'tamagui';
import { formatMoney } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import {
  canCancelReturn,
  refundCopy,
  returnStatusKey,
  returnTone,
  type ReturnTone,
} from '@/utils/pod-shop-returns';
import type { PodShopReturn } from '@/utils/product-orders';

const TONE_CHIP: Record<ReturnTone, { bg: string; fg: string }> = {
  active: { bg: '$primarySoft', fg: '$accent' },
  done: { bg: '$primary', fg: '$onPrimary' },
  closed: { bg: '$soft', fg: '$muted' },
};

interface Props {
  ret: PodShopReturn;
  currencySymbol: string;
  onCancel: (ret: PodShopReturn) => void;
}

/** One return under its order: number + status, what is going back, the
 * pickup, the brand's note and the refund. mWeb twin:
 * pages/orders-history-page/PodShopReturnCard (rule 27). */
export function PodShopReturnCard({ ret, currencySymbol, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const money = (amount: number) => formatMoney(amount, { symbol: currencySymbol });
  const refundLines = refundCopy(ret.refund, money, formatDate);
  const tone = TONE_CHIP[returnTone(ret.status)];

  return (
    <YStack
      testID={`pod-shop-return-${ret.id}`}
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={12}
      padding={12}
      gap={4}
    >
      <XStack gap={8} alignItems="center">
        <Text flex={1} fontSize={13} fontWeight="600" color="$color" numberOfLines={1}>
          {t('mweb.podShopReturns.returnNo', { vars: { returnNo: ret.return_no } })}
        </Text>
        <XStack
          testID={`pod-shop-return-status-${ret.id}`}
          borderRadius={999}
          paddingHorizontal={10}
          paddingVertical={4}
          backgroundColor={tone.bg}
        >
          <Text fontSize={11} fontWeight="600" color={tone.fg}>
            {t(returnStatusKey(ret.status))}
          </Text>
        </XStack>
      </XStack>
      {ret.items.map((item) => (
        <Text key={`${item.product_id}-${item.variant_id || 'base'}`} fontSize={12} color="$muted">
          {item.name}
          {item.variant_label ? ` — ${item.variant_label}` : ''} × {item.qty}
        </Text>
      ))}
      {ret.pickup.awb ? (
        <Text testID={`pod-shop-return-pickup-${ret.id}`} fontSize={12} color="$color">
          {t('mweb.podShopReturns.pickupAwb', { vars: { awb: ret.pickup.awb } })}
          {ret.pickup.courier_name ? ` · ${ret.pickup.courier_name}` : ''}
        </Text>
      ) : null}
      {ret.decision_note ? (
        <Text fontSize={12} color="$color">
          {t('mweb.podShopReturns.decisionNote', { vars: { note: ret.decision_note } })}
        </Text>
      ) : null}
      {refundLines.map((line, index) => (
        <Text
          key={line.key}
          testID={`pod-shop-return-refund-${ret.id}-${index}`}
          fontSize={12}
          color="$color"
        >
          {t(line.key, { vars: line.vars })}
        </Text>
      ))}
      {canCancelReturn(ret.status) ? (
        <XStack>
          <DuncitButton
            label={t('mweb.podShopReturns.cancelReturn')}
            variant="outline"
            tone="danger"
            size="sm"
            testID={`pod-shop-return-withdraw-${ret.id}`}
            onPress={() => onCancel(ret)}
          />
        </XStack>
      ) : null}
    </YStack>
  );
}
