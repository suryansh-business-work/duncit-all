import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';
import { smartIncentiveFor } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  open: boolean;
  /** The offer the member just unlocked. */
  pct: number;
  /** One ticket's full price. */
  podAmount: number;
  /** The admin's currency symbol (public finance settings). */
  currency: string;
  /** Straight on to checkout — through the page's clash check, like the booking bar. */
  onBook: () => void;
  onClose: () => void;
}

/**
 * The Smart Incentive popup: the member stayed on the pod page long enough,
 * so the offer is now theirs — what it takes off and what one ticket then
 * costs, with "Book now" into checkout (which applies it on its own) and
 * "Maybe later". mWeb twin: the pod page's Smart Incentive dialog (rule 27).
 */
export function SmartIncentiveOfferDialog({
  open,
  pct,
  podAmount,
  currency,
  onBook,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { success } = useThemeColors();
  const price = smartIncentiveFor(podAmount, pct).net;
  return (
    <DuncitDialog
      open={open}
      onClose={onClose}
      testID="smart-incentive-offer"
      title={t('mweb.smartIncentive.offerTitle', { vars: { pct } })}
      closeLabel={t('mweb.common.close')}
      variant="center"
      // "Maybe later" is the way out, so the header carries no second one.
      showCloseButton={false}
      footer={
        <YStack gap={8}>
          <DuncitButton
            testID="smart-incentive-offer-book"
            label={t('mweb.smartIncentive.offerBook')}
            onPress={onBook}
            fullWidth
          />
          <DuncitButton
            testID="smart-incentive-offer-later"
            label={t('mweb.smartIncentive.offerLater')}
            onPress={onClose}
            variant="ghost"
            tone="neutral"
            fullWidth
          />
        </YStack>
      }
    >
      <YStack gap={12} alignItems="center">
        <MaterialIcons name="local-offer" size={32} color={success} aria-hidden />
        <Text fontSize={14} lineHeight={20} color="$color" textAlign="center">
          {t('mweb.smartIncentive.offerBody', { vars: { pct } })}
        </Text>
        <Text
          testID="smart-incentive-offer-price"
          fontSize={16}
          fontWeight="700"
          color="$color"
          textAlign="center"
        >
          {t('mweb.smartIncentive.offerPrice', {
            vars: { price: `${currency}${price}`, fullPrice: `${currency}${podAmount}` },
          })}
        </Text>
      </YStack>
    </DuncitDialog>
  );
}
