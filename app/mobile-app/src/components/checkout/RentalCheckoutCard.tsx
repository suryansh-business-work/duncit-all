import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { rentalMoney, type RentalSummaryLine } from '@duncit/utils';

import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import type { CheckoutRentals } from '@/hooks/useCheckoutRentals';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

import { SummaryRow } from './SummaryRow';

interface RentalLinesProps {
  lines: readonly RentalSummaryLine[];
  currency: string;
  /** Finance's rule: false means the venue keeps the deposit. */
  depositRefundable: boolean;
  testID: string;
}

/** Each rented item on its own line — what, how many, its rent and its deposit. Shared with the confirmation. */
export function RentalItemLines({
  lines,
  currency,
  depositRefundable,
  testID,
}: Readonly<RentalLinesProps>) {
  const { t } = useTranslation();
  return (
    <YStack gap={6} testID={testID}>
      {lines.map((line) => (
        <YStack key={line.id} gap={2}>
          <SummaryRow
            testID={`${testID}-${line.id}`}
            label={t('venueRentals.guest.itemLine', {
              vars: { name: line.name, quantity: line.quantity },
            })}
            value={rentalMoney(currency, line.rent)}
          />
          {line.deposit > 0 ? (
            <Text fontSize={12} color="$muted">
              {depositRefundable
                ? t('venueRentals.guest.depositAtVenue', {
                    vars: { amount: rentalMoney(currency, line.deposit) },
                  })
                : `${t('venueRentals.guest.depositKept')} ${rentalMoney(currency, line.deposit)}`}
            </Text>
          ) : null}
        </YStack>
      ))}
    </YStack>
  );
}

/** Where the items and their deposits are handled: at the venue, never refunded online. */
export function RentalCollectNotice({
  depositRefundable,
}: Readonly<{ depositRefundable: boolean }>) {
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  return (
    <XStack
      gap={10}
      padding={12}
      borderRadius={14}
      backgroundColor="$soft"
      testID="rental-collect-notice"
      role="note"
    >
      <MaterialIcons name="storefront" size={20} color={primary} />
      <YStack flex={1} gap={2}>
        <Text fontSize={13} fontWeight="700" color="$color">
          {t('venueRentals.guest.collectTitle')}
        </Text>
        <Text fontSize={12.5} color="$muted">
          {depositRefundable
            ? t('venueRentals.guest.collectNote')
            : t('venueRentals.guest.collectNoteKept')}
        </Text>
      </YStack>
    </XStack>
  );
}

/**
 * The rented items on this booking: every item, the rent and deposit totals,
 * the ticket-only note and where it is all settled. The agreement to the
 * terms sits above Pay (RentalTermsConsent). RN twin of mWeb's RentalBillRows.
 */
export function RentalCheckoutCard({ rentals }: Readonly<{ rentals: CheckoutRentals }>) {
  const { t } = useTranslation();
  const { totals, currency, settings, lines } = rentals;
  if (totals.count === 0) return null;
  const refundable = settings?.deposit_refundable !== false;
  return (
    <SurfaceCard gap={10} testID="checkout-rentals">
      <SectionHeader title={t('venueRentals.guest.rentLine')} />
      <RentalItemLines
        lines={lines}
        currency={currency}
        depositRefundable={refundable}
        testID="checkout-rental-line"
      />
      <SummaryRow
        testID="checkout-rental-rent"
        label={t('venueRentals.guest.rentSubtotal')}
        value={`+ ${rentalMoney(currency, totals.rent)}`}
      />
      {totals.deposit > 0 ? (
        <SummaryRow
          testID="checkout-rental-deposit"
          label={t(
            refundable ? 'venueRentals.guest.depositLine' : 'venueRentals.guest.depositKept',
          )}
          value={`+ ${rentalMoney(currency, totals.deposit)}`}
        />
      ) : null}
      <Text fontSize={12} color="$muted">
        {t('venueRentals.guest.ticketOnly')}
      </Text>
      <RentalCollectNotice depositRefundable={refundable} />
    </SurfaceCard>
  );
}
