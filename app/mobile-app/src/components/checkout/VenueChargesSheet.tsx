import { Text, YStack } from 'tamagui';

import { DuncitDialog } from '@/components/DuncitDialog';
import { useTranslation } from '@/hooks/useTranslation';

import { VenueChargesList } from './VenueChargesList';

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
      <YStack>
        <VenueChargesList
          charges={charges}
          currency={currency}
          totalLabel={t('mweb.checkout.venueChargesTotal')}
        />
        <Text fontSize={11.5} color="$muted" paddingTop={12}>
          {t('mweb.checkout.venueChargesNote')}
        </Text>
      </YStack>
    </DuncitDialog>
  );
}
