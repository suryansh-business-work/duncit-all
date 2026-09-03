import { startOfDay } from 'date-fns';
import { Text, YStack } from 'tamagui';
import { NO_SPACE, type SlotDraft } from '@duncit/slots';

import { ChipSelectField } from '@/components/create-pod/ChipSelectField';
import { LabeledInput } from '@/components/LabeledInput';
import { ToggleRow } from '@/components/ToggleRow';
import { useTranslation } from '@/hooks/useTranslation';
import { DateTimePickerField } from './DateTimePickerField';
import { spaceOptionLabel } from './slot-labels';

/** One of the venue's capacity entries — "Court 1", holds 4. */
export interface VenueSpace {
  label: string;
  capacity: number;
}

interface Props {
  draft: SlotDraft;
  patch: (p: Partial<SlotDraft>) => void;
  /** The venue's bookable spaces. Empty = the venue sells as one whole venue. */
  spaces: VenueSpace[];
  /** The space this slot lands in: the picked one, or the first as the default. */
  activeSpace?: VenueSpace;
  /** The current time, re-read by the form as it ticks; it bounds the pickers. */
  now: Date;
}

/**
 * The inputs of the add-slot form — the Tamagui twin of the MUI AddSlotFields
 * (rule 27). Purely presentational: it owns no state, no validation and no
 * submit; those stay with AddSlotForm.
 *
 * One sheet picks a date and its time together, so a pick lands in both
 * halves of the draft. A whole-day slot only needs the dates, and leaves the
 * times untouched so switching back does not lose a time already picked.
 */
export function AddSlotFields({ draft, patch, spaces, activeSpace, now }: Readonly<Props>) {
  const { t } = useTranslation();
  const { wholeDay, startDate, endDate, price, notes } = draft;
  const isMultiDay =
    !!startDate && !!endDate && startOfDay(endDate).getTime() > startOfDay(startDate).getTime();

  const setStart = (picked: Date) =>
    patch(wholeDay ? { startDate: picked } : { startDate: picked, startTime: picked });
  const setEnd = (picked: Date) =>
    patch(wholeDay ? { endDate: picked } : { endDate: picked, endTime: picked });

  return (
    <YStack gap={12}>
      <ToggleRow
        testID="add-slot-whole-day"
        label={t('availability.wholeDay')}
        hint={t('availability.wholeDayHint')}
        value={wholeDay}
        onChange={(next) => patch({ wholeDay: next })}
      />
      {spaces.length > 0 ? (
        <ChipSelectField
          testID="add-slot-space"
          label={t('availability.space')}
          hint={t('availability.spaceHint')}
          options={spaces.map((space) => ({
            value: space.label,
            label: spaceOptionLabel(space, t),
          }))}
          value={activeSpace?.label ?? NO_SPACE}
          onChange={(label) => patch({ spaceLabel: label })}
        />
      ) : null}
      <DateTimePickerField
        testID="add-slot-start"
        label={t('availability.startDate')}
        value={startDate}
        onChange={setStart}
        minDateTime={now}
        withTime={!wholeDay}
      />
      <DateTimePickerField
        testID="add-slot-end"
        label={t('availability.endDate')}
        value={endDate}
        onChange={setEnd}
        minDateTime={startDate ?? now}
        withTime={!wholeDay}
      />
      {isMultiDay ? (
        <Text testID="add-slot-multi-day" fontSize={12} color="$primary">
          {t('availability.multiDayHint')}
        </Text>
      ) : null}
      <LabeledInput
        testID="add-slot-price"
        label={t('availability.price')}
        hint={t('availability.priceHint')}
        value={price}
        onChangeText={(next) => patch({ price: next })}
        keyboardType="numeric"
      />
      <LabeledInput
        testID="add-slot-notes"
        label={t('availability.notes')}
        value={notes}
        onChangeText={(next) => patch({ notes: next })}
        maxLength={280}
      />
    </YStack>
  );
}
