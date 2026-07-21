import { Text, XStack, YStack } from 'tamagui';

import {
  slotOptionLabel,
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
        fontWeight="800"
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
      <Text fontSize={13} fontWeight="800" color="$color">
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

/** Available-slot picker for the chosen venue (time window + space + price). */
export function SlotPickerField({
  slots,
  loading,
  hasVenue,
  value,
  error,
  onChange,
}: Readonly<SlotPickerFieldProps>) {
  let emptyText: string | null = null;
  if (!hasVenue) emptyText = 'Select a venue first';
  else if (loading) emptyText = 'Loading slots…';
  else if (slots.length === 0) emptyText = 'No open slots at this venue — pick another venue';
  return (
    <PickerShell title="Time slot" emptyText={emptyText} error={error}>
      {slots.map((slot) => (
        <OptionRow
          key={slot.id}
          testID={`resubmit-slot-${slot.id}`}
          label={slotOptionLabel(slot)}
          selected={slot.id === value}
          onPress={() => onChange(slot.id)}
        />
      ))}
    </PickerShell>
  );
}
