import { Text, XStack, YStack } from 'tamagui';

import { DuncitDialog } from '@/components/DuncitDialog';
import { useTranslation } from '@/hooks/useTranslation';
import { formatMoney } from '@/utils/checkout-math';

export interface VenueCharge {
  label: string;
  amount: number;
  note?: string | null;
}

interface Props {
  open: boolean;
  charges: readonly VenueCharge[];
  currency: string;
  onClose: () => void;
  testID?: string;
}

/** Info sheet explaining the venue-side charges shown on checkout. These are
 * paid directly at the venue and are NOT part of the online payable amount, so
 * this purely explains + itemises them.
 *
 * On {@link DuncitDialog} because `charges` is server-driven: the card had no
 * height cap and no scroller, so a venue with many line items pushed the total
 * and the closing note off the screen. */
export function VenueChargesSheet({
  open,
  charges,
  currency,
  onClose,
  testID = 'venue-charges-sheet',
}: Readonly<Props>) {
  const total = charges.reduce((sum, charge) => sum + charge.amount, 0);
  const { t } = useTranslation();

  return (
    <DuncitDialog
      open={open}
      onClose={onClose}
      testID={testID}
      variant="center"
      title={t('mweb.checkout.venueCharges')}
      subtitle={t('mweb.checkout.venueChargesIntro')}
      closeLabel={t('mweb.checkout.close')}
    >
      <YStack gap={8}>
        {charges.map((charge) => (
          <XStack
            key={`${charge.label}|${charge.amount}|${charge.note ?? ''}`}
            justifyContent="space-between"
            gap={12}
          >
            <YStack flex={1}>
              <Text fontSize={13} fontWeight="700" color="$color">
                {charge.label}
              </Text>
              {charge.note ? (
                <Text fontSize={11.5} color="$muted">
                  {charge.note}
                </Text>
              ) : null}
            </YStack>
            <Text fontSize={13} fontWeight="600" color="$color">
              {formatMoney(currency, charge.amount)}
            </Text>
          </XStack>
        ))}
        <YStack height={1} backgroundColor="$borderColor" marginVertical={2} />
        <XStack justifyContent="space-between">
          <Text fontSize={13} fontWeight="700" color="$color">
            {t('mweb.checkout.venueChargesTotal')}
          </Text>
          <Text fontSize={13} fontWeight="700" color="$color">
            {formatMoney(currency, total)}
          </Text>
        </XStack>
        <Text fontSize={11.5} color="$muted" paddingTop={12}>
          {t('mweb.checkout.venueChargesNote')}
        </Text>
      </YStack>
    </DuncitDialog>
  );
}
