import { useMemo } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { buildSlotLabels } from '@duncit/slots';
import { SlotCalendar } from '@/components/slots';

import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import {
  venueOptionLabel,
  type ResubmitSlotOption,
  type ResubmitVenueOption,
} from './pod-resubmit.form';

interface OptionRowProps {
  testID: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}

/** One pressable option row shared by the venue + slot pickers. */
function OptionRow({ testID, label, selected, onPress }: Readonly<OptionRowProps>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={onPress}
      paddingHorizontal={12}
      paddingVertical={10}
      borderRadius={10}
      borderWidth={1}
      borderColor={selected ? '$primary' : '$borderColor'}
      backgroundColor={selected ? '$primary' : '$surface'}
      pressStyle={{ opacity: 0.85 }}
    >
      <Text
        fontSize={13}
        fontWeight="600"
        color={selected ? '$onPrimary' : '$color'}
        numberOfLines={1}
      >
        {label}
      </Text>
    </XStack>
  );
}

interface PickerShellProps {
  title: string;
  emptyText: string | null;
  error?: string;
  children: React.ReactNode;
}

/** Field wrapper: title, options, empty note and the RHF error line. */
function PickerShell({ title, emptyText, error, children }: Readonly<PickerShellProps>) {
  return (
    <YStack gap={6}>
      <Text fontSize={13} fontWeight="600" color="$color">
        {title}
      </Text>
      {children}
      {emptyText ? (
        <Text fontSize={12} color="$muted">
          {emptyText}
        </Text>
      ) : null}
      {error ? (
        <Text fontSize={12} color="$danger">
          {error}
        </Text>
      ) : null}
    </YStack>
  );
}

interface VenuePickerFieldProps {
  venues: ResubmitVenueOption[];
  value: string;
  error?: string;
  onChange: (venueId: string) => void;
}

/** Approved-venue picker for the resubmission — any partner venue is bookable. */
export function VenuePickerField({
  venues,
  value,
  error,
  onChange,
}: Readonly<VenuePickerFieldProps>) {
  const emptyText = venues.length === 0 ? 'Loading venues…' : null;
  return (
    <PickerShell title="Venue" emptyText={emptyText} error={error}>
      {venues.map((venue) => (
        <OptionRow
          key={venue.id}
          testID={`resubmit-venue-${venue.id}`}
          label={venueOptionLabel(venue)}
          selected={venue.id === value}
          onPress={() => onChange(venue.id)}
        />
      ))}
    </PickerShell>
  );
}

interface SlotPickerFieldProps {
  slots: ResubmitSlotOption[];
  loading: boolean;
  hasVenue: boolean;
  value: string;
  error?: string;
  onChange: (slotId: string) => void;
}

/**
 * Available-slot picker for the chosen venue — the same calendar the create-pod
 * flow uses, and the Tamagui twin of mWeb's resubmit picker.
 */
export function SlotPickerField({
  slots,
  loading,
  hasVenue,
  value,
  error,
  onChange,
}: Readonly<SlotPickerFieldProps>) {
  const fmt = useDateFormat();
  const { t } = useTranslation();
  const labels = useMemo(() => buildSlotLabels(t, 'mweb.slots'), [t]);

  const calendarSlots = useMemo(
    () =>
      slots.map((slot) => ({
        id: slot.id,
        start_at: slot.start_at,
        end_at: slot.end_at,
        whole_day: slot.whole_day,
        price: slot.price,
        // A venue can publish two spaces at the same hour; without the space the
        // two tiles would be indistinguishable.
        caption: slot.space_label || undefined,
      })),
    [slots],
  );

  if (!hasVenue) {
    return (
      <Text fontSize={13} color="$muted">
        {labels.pickVenueFirst}
      </Text>
    );
  }

  return (
    <SlotCalendar
      slots={calendarSlots}
      loading={loading}
      error={error}
      selectedSlotId={value}
      onPick={(slot) => onChange(slot.id)}
      fmt={fmt}
      labels={labels}
      required
    />
  );
}
