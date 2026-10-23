import { useMemo } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { buildSlotLabels } from '@duncit/slots';
import { WHOLE_VENUE_SPACE } from '@duncit/utils';
import { SlotCalendar } from '@/components/slots';

import { BookingEndPicker } from '@/components/create-pod/steps/VenueSlotStep/BookingEndPicker';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useOfferCalendar } from '@/hooks/useOfferCalendar';
import { useTranslation } from '@/hooks/useTranslation';
import { venueOptionLabel, type ResubmitVenueOption } from './pod-resubmit.form';
import { PRESS_STYLE } from '@duncit/buttons-native';

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
      tabIndex={0}
      role="radio"
      aria-label={label}
      aria-checked={selected}
      onPress={onPress}
      paddingHorizontal={14}
      paddingVertical={12}
      borderRadius={14}
      borderWidth={1}
      borderColor={selected ? '$primary' : '$cardBorder'}
      backgroundColor={selected ? '$primary' : '$surface'}
      pressStyle={PRESS_STYLE.control}
    >
      <Text
        fontSize={14}
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
      <YStack gap={6} role="radiogroup" aria-label={title}>
        {children}
      </YStack>
      {emptyText ? (
        <Text fontSize={12} color="$muted">
          {emptyText}
        </Text>
      ) : null}
      {error ? (
        <Text role="alert" fontSize={12} color="$danger">
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
  const { t } = useTranslation();
  const emptyText = venues.length === 0 ? 'Loading venues…' : null;
  return (
    <PickerShell title={t('mweb.common.venue')} emptyText={emptyText} error={error}>
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

interface OfferWindowPickerProps {
  venueId: string;
  /** The window picked so far (ISO), '' while none is. */
  start: string;
  end: string;
  error?: string;
  /** A start is always picked with its first end (a start is only offered with room for one). */
  onWindow: (start: string, end: string) => void;
}

/**
 * The window to offer the new venue — a start it is open and free for, then
 * an end up to closing — on the same calendar Create Pod uses. The Tamagui twin
 * of mWeb's resubmit OfferWindowField.
 */
export function OfferWindowPicker({
  venueId,
  start,
  end,
  error,
  onWindow,
}: Readonly<OfferWindowPickerProps>) {
  const fmt = useDateFormat();
  const { t } = useTranslation();
  const labels = useMemo(() => buildSlotLabels(t, 'mweb.slots'), [t]);
  const calendar = useOfferCalendar(venueId, venueId ? WHOLE_VENUE_SPACE : '');

  if (!venueId) {
    return (
      <Text fontSize={13} color="$muted">
        {labels.pickVenueFirst}
      </Text>
    );
  }

  return (
    <YStack gap={12}>
      <SlotCalendar
        slots={calendar.tiles}
        loading={calendar.loading}
        error={error}
        selectedSlotId={start}
        onPick={(tile) => onWindow(tile.start_at, calendar.endsFor(tile.start_at)[0] ?? '')}
        fmt={fmt}
        labels={labels}
        showPrice={false}
        required
      />
      {start ? (
        <BookingEndPicker
          ends={calendar.endsFor(start)}
          endIso={end}
          onPick={(next) => onWindow(start, next)}
        />
      ) : null}
    </YStack>
  );
}
