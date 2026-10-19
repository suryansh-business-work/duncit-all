import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { DuncitDialog } from '@/components/DuncitDialog/DuncitDialog';
import type { CheckoutRentals } from '@/hooks/useCheckoutRentals';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { stripHtml } from '@/utils/html';

/**
 * The guest agrees to the rental terms right above Pay; "rental terms" opens
 * Duncit's terms and the venue's own, read together as plain text so no
 * venue-written markup ever renders. RN twin of mWeb's RentalTermsConsent.
 */
export function RentalTermsConsent({ rentals }: Readonly<{ rentals: CheckoutRentals }>) {
  const { t } = useTranslation();
  const { primary, color } = useThemeColors();
  const [open, setOpen] = useState(false);
  if (rentals.totals.count === 0) return null;
  const terms = stripHtml(rentals.settings?.terms_html);
  const venueTerms = stripHtml(rentals.venueTerms);
  return (
    <XStack alignItems="center" gap={8} flexWrap="wrap" testID="checkout-rental-consent">
      <XStack
        role="checkbox"
        aria-checked={rentals.agreed}
        aria-label={`${t('venueRentals.guest.agreeLead')} ${t('venueRentals.guest.termsLink')}`}
        tabIndex={0}
        onPress={() => rentals.setAgreed(!rentals.agreed)}
        alignItems="center"
        gap={8}
        pressStyle={PRESS_STYLE.control}
        testID="checkout-rental-agree"
      >
        <MaterialIcons
          name={rentals.agreed ? 'check-box' : 'check-box-outline-blank'}
          size={22}
          color={rentals.agreed ? primary : color}
        />
        <Text fontSize={13.5} color="$color">
          {t('venueRentals.guest.agreeLead')}
        </Text>
      </XStack>
      {terms || venueTerms ? (
        <XStack
          role="link"
          tabIndex={0}
          onPress={() => setOpen(true)}
          {...PRESS_STYLE}
          testID="checkout-rental-terms"
        >
          <Text fontSize={13.5} fontWeight="600" color="$accent" textDecorationLine="underline">
            {t('venueRentals.guest.termsLink')}
          </Text>
        </XStack>
      ) : (
        <Text fontSize={13.5} color="$color">
          {t('venueRentals.guest.termsLink')}
        </Text>
      )}
      <DuncitDialog
        open={open}
        onClose={() => setOpen(false)}
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
    </XStack>
  );
}
