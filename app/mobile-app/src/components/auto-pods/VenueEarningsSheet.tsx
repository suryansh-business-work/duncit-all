import { useState } from 'react';
import { Input, Text, XStack, YStack } from 'tamagui';
import {
  autoPodSpaceEarnings,
  autoPodVenueSpaces,
  type AutoPodLabels,
  type AutoPodVenueSpace,
} from '@duncit/utils';

import { DuncitDialog } from '@/components/DuncitDialog';
import { PillButton } from '@/components/attendance/AttendanceOtpControls';
import type { AutoPodVenueOption } from '@/hooks/useAutoPodVenues';
import { useThemeColors } from '@/hooks/useThemeColors';

const inputStyle = {
  size: '$4',
  backgroundColor: '$surface',
  color: '$color',
  placeholderTextColor: '$muted',
  borderColor: '$borderColor',
} as const;

/** A space's own identity for React and for the price map. Labels are the
 * venue's own free text and two spaces may share one, so the index
 * disambiguates rather than standing in as the key (S6479). */
const spaceKey = (space: AutoPodVenueSpace, index: number) => `${index}-${space.label}`;

interface RowProps {
  space: AutoPodVenueSpace;
  price: string;
  onPrice: (value: string) => void;
  labels: AutoPodLabels;
  formatMoney: (amount: number) => string;
  success: string;
}

/**
 * One of the venue's spaces, priced by the venue itself. The capacity is the
 * venue's own published number and the multiplication is spelled out —
 * "₹250 × 6 = ₹1,500" — because the point of the sheet is to show the venue
 * where the figure came from, not just the total.
 */
function VenueSpaceRow({
  space,
  price,
  onPrice,
  labels,
  formatMoney,
  success,
}: Readonly<RowProps>) {
  const amount = Number(price) || 0;
  const total = autoPodSpaceEarnings(amount, space.capacity);
  return (
    <YStack
      gap={8}
      padding={12}
      borderRadius={14}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <XStack alignItems="center" justifyContent="space-between" gap={8}>
        <Text flex={1} fontSize={13.5} fontWeight="700" color="$color">
          {space.label || labels.earningsWholeVenue}
        </Text>
        <Text fontSize={12} color="$muted">
          {labels.earningsSpaceCapacity(space.capacity)}
        </Text>
      </XStack>
      <Input
        testID={`auto-pod-space-price-${space.label || 'whole'}`}
        {...inputStyle}
        keyboardType="numeric"
        value={price}
        // Digits only — a ticket price is whole rupees.
        onChangeText={(text) => onPrice(text.replace(/[^0-9]/g, ''))}
        placeholder={labels.ticketPrice}
        aria-label={labels.ticketPrice}
      />
      {total === null ? (
        <Text fontSize={12} color="$muted">
          {labels.earningsEnterPrice}
        </Text>
      ) : (
        <Text testID="auto-pod-space-earning" fontSize={12.5} fontWeight="700" color={success}>
          {labels.earningsFormula(formatMoney(amount), space.capacity, formatMoney(total))}
        </Text>
      )}
    </YStack>
  );
}

interface Props {
  /** True while the sheet is open — the venue is the one picked at the top. */
  open: boolean;
  venue: AutoPodVenueOption | null;
  labels: AutoPodLabels;
  onClose: () => void;
  formatMoney: (amount: number) => string;
  /** The best figure the venue reached, for the card's earn line. */
  onEarnings: (amount: number | null) => void;
}

/**
 * A venue's "View Potential Earnings": every space it publishes, with its
 * capacity, and a ticket price the venue types per space. What a space could
 * take is Ticket Price × Slots, which is the pod's gross at that space — it is
 * deliberately NOT the payout after Finance's deductions, because the venue is
 * sizing the opportunity here rather than reading a settlement.
 *
 * Nothing is saved: this is a calculator the venue opens, reads and closes.
 * The Tamagui twin of `@duncit/auto-pods`' `VenueEarningsDialog` (rule 27).
 */
export function VenueEarningsSheet({
  open,
  venue,
  labels,
  onClose,
  formatMoney,
  onEarnings,
}: Readonly<Props>) {
  const { success } = useThemeColors();
  const [prices, setPrices] = useState<Record<string, string>>({});
  const spaces = autoPodVenueSpaces(venue);

  // The card shows ONE number, so the best a space could take is the one that
  // rides back — a venue comparing spaces is picking the one it would offer.
  const close = () => {
    const totals = spaces
      .map((space, index) =>
        autoPodSpaceEarnings(Number(prices[spaceKey(space, index)]) || 0, space.capacity),
      )
      .filter((total): total is number => total !== null);
    onEarnings(totals.length > 0 ? Math.max(...totals) : null);
    onClose();
  };

  const footer = (
    <XStack gap={10}>
      <YStack flex={1}>
        <PillButton
          testID="auto-pod-earnings-close"
          label={labels.close}
          onPress={close}
          variant="solid"
          disabled={false}
        />
      </YStack>
    </XStack>
  );

  return (
    <DuncitDialog
      open={open}
      onClose={close}
      testID="auto-pod-venue-earnings-sheet"
      title={labels.earningsTitle}
      closeLabel={labels.closeAria}
      footer={footer}
    >
      <YStack gap={10}>
        {spaces.length === 0 ? (
          <Text testID="auto-pod-no-spaces" fontSize={12.5} color="$muted">
            {labels.earningsNoSpaces}
          </Text>
        ) : (
          <>
            <Text fontSize={12.5} color="$muted">
              {labels.earningsSpacesHint}
            </Text>
            {spaces.map((space, index) => {
              const key = spaceKey(space, index);
              return (
                <VenueSpaceRow
                  key={key}
                  space={space}
                  price={prices[key] ?? ''}
                  onPrice={(value) => setPrices((prev) => ({ ...prev, [key]: value }))}
                  labels={labels}
                  formatMoney={formatMoney}
                  success={success}
                />
              );
            })}
          </>
        )}
      </YStack>
    </DuncitDialog>
  );
}
