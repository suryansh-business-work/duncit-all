import { useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { rentalMoney } from '@duncit/utils';

import { DuncitDialog } from '@/components/DuncitDialog/DuncitDialog';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { ToggleRow } from '@/components/ToggleRow/ToggleRow';
import type { CheckoutRentals } from '@/hooks/useCheckoutRentals';
import { useTranslation } from '@/hooks/useTranslation';
import { stripHtml } from '@/utils/html';

import { SummaryRow } from './SummaryRow';

/**
 * The rented items on this booking: rent, deposit (refundable or kept, per
 * Finance's rule), the ticket-only note and the agreement to the rental
 * terms. Hidden when nothing is picked. RN twin of mWeb's RentalCheckoutBlock.
 */
export function RentalCheckoutCard({ rentals }: Readonly<{ rentals: CheckoutRentals }>) {
  const { t } = useTranslation();
  const [termsOpen, setTermsOpen] = useState(false);
  const { totals, currency, settings } = rentals;
  if (totals.count === 0) return null;
  const depositKey =
    settings?.deposit_refundable === false
      ? 'venueRentals.guest.depositKept'
      : 'venueRentals.guest.depositLine';
  // Duncit's terms and the venue's own, read together — as plain text, so no
  // venue-written markup ever renders.
  const terms = stripHtml(settings?.terms_html);
  const venueTerms = stripHtml(rentals.venueTerms);
  return (
    <SurfaceCard gap={10} testID="checkout-rentals">
      <SectionHeader title={t('venueRentals.guest.rentLine')} />
      <SummaryRow
        testID="checkout-rental-rent"
        label={t('venueRentals.guest.rentLine')}
        value={`+ ${rentalMoney(currency, totals.rent)}`}
      />
      {totals.deposit > 0 ? (
        <SummaryRow
          testID="checkout-rental-deposit"
          label={t(depositKey)}
          value={`+ ${rentalMoney(currency, totals.deposit)}`}
        />
      ) : null}
      <Text fontSize={12} color="$muted">
        {t('venueRentals.guest.ticketOnly')}
      </Text>
      <ToggleRow
        label={t('venueRentals.guest.agree')}
        value={rentals.agreed}
        onChange={rentals.setAgreed}
        testID="checkout-rental-agree"
      />
      {terms || venueTerms ? (
        <XStack
          role="button"
          tabIndex={0}
          aria-label={t('venueRentals.guest.termsTitle')}
          testID="checkout-rental-terms"
          onPress={() => setTermsOpen(true)}
          {...PRESS_STYLE}
        >
          <Text fontSize={13} fontWeight="600" color="$accent">
            {t('venueRentals.guest.termsTitle')}
          </Text>
        </XStack>
      ) : null}
      <DuncitDialog
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        testID="rental-terms-sheet"
        title={t('venueRentals.guest.termsTitle')}
        closeLabel={t('mweb.common.close')}
      >
        <YStack gap={14}>
          {terms ? (
            <YStack gap={4}>
              <Text fontSize={13.5} fontWeight="700" color="$color">
                {t('venueRentals.guest.duncitTerms')}
              </Text>
              <Text fontSize={13.5} color="$color">
                {terms}
              </Text>
            </YStack>
          ) : null}
          {venueTerms ? (
            <YStack gap={4}>
              <Text fontSize={13.5} fontWeight="700" color="$color">
                {t('venueRentals.guest.venueTerms')}
              </Text>
              <Text fontSize={13.5} color="$color">
                {venueTerms}
              </Text>
            </YStack>
          ) : null}
        </YStack>
      </DuncitDialog>
    </SurfaceCard>
  );
}
