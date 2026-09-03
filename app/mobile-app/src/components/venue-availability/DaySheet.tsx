import { useState } from 'react';
import { Text, YStack } from 'tamagui';

import { ConfirmSheet, DuncitDialog } from '@/components/DuncitDialog';
import type { NewVenueSlotInput, VenueSlot } from '@/hooks/useOwnerVenueSlots';
import { useTranslation } from '@/hooks/useTranslation';
import { formatDay } from '@/utils/date-format';
import { AddSlotForm } from './AddSlotForm';
import type { VenueSpace } from './AddSlotFields';
import { DaySlotRow } from './DaySlotRow';
import { dayFromKey } from './availability-grid';

interface Props {
  /** The open day, or null while the sheet is closed. */
  dayKey: string | null;
  slots: VenueSlot[];
  /** True when this date is a venue leave/holiday — nothing can be added. */
  isHoliday: boolean;
  spaces: VenueSpace[];
  onClose: () => void;
  onCreate: (input: NewVenueSlotInput, overwrite: boolean) => Promise<void>;
  onToggleBlock: (slot: VenueSlot) => Promise<void>;
  onDelete: (slotId: string) => Promise<void>;
}

/**
 * The day editor — the Tamagui twin of the MUI DayDrawer (rule 27): the
 * day's slots with block/delete, then the add form. It owns the confirm and
 * the error line; the screen wires the create/update/delete calls.
 */
export function DaySheet({
  dayKey,
  slots,
  isHoliday,
  spaces,
  onClose,
  onCreate,
  onToggleBlock,
  onDelete,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<VenueSlot | null>(null);

  const toggleBlock = (slot: VenueSlot) => {
    setBusy(true);
    setError(null);
    onToggleBlock(slot)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : t('availability.updateFailed')),
      )
      .finally(() => setBusy(false));
  };

  const confirmDelete = () => {
    if (!deleting) return;
    setBusy(true);
    setError(null);
    onDelete(deleting.id)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : t('availability.deleteFailed')),
      )
      .finally(() => {
        setBusy(false);
        setDeleting(null);
      });
  };

  return (
    <DuncitDialog
      open={!!dayKey}
      onClose={onClose}
      testID="availability-day-sheet"
      title={t('availability.drawerTitle')}
      subtitle={dayKey ? formatDay(dayKey) : undefined}
      closeLabel={t('availability.close')}
    >
      {dayKey ? (
        <YStack gap={12}>
          {isHoliday ? (
            <Text testID="availability-holiday-alert" fontSize={12.5} color="$danger">
              {t('availability.holidayAlert')}
            </Text>
          ) : null}
          <Text fontSize={12} fontWeight="700" color="$muted" letterSpacing={1}>
            {t('availability.existingSlots')}
          </Text>
          {error ? (
            <Text testID="availability-day-error" fontSize={12.5} color="$danger">
              {error}
            </Text>
          ) : null}
          {slots.length === 0 ? (
            <Text testID="availability-day-empty" fontSize={13} color="$muted">
              {t('availability.noSlotsForDate')}
            </Text>
          ) : null}
          {slots.map((slot) => (
            <DaySlotRow
              key={slot.id}
              slot={slot}
              busy={busy}
              onToggleBlock={toggleBlock}
              onDelete={setDeleting}
            />
          ))}
          {isHoliday ? null : (
            <AddSlotForm
              key={dayKey}
              date={dayFromKey(dayKey)}
              spaces={spaces}
              onCreate={onCreate}
            />
          )}
        </YStack>
      ) : null}
      <ConfirmSheet
        open={!!deleting}
        busy={busy}
        testIDPrefix="day-slot-delete"
        title={t('availability.deleteTitle')}
        message={t('availability.deleteBody')}
        cancelLabel={t('availability.cancel')}
        confirmLabel={t('availability.delete')}
        busyLabel={t('availability.delete')}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </DuncitDialog>
  );
}
