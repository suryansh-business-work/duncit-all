import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import {
  forceMarkInitialValues,
  makeForceMarkSchema,
  type ForceMarkValues,
} from '@duncit/forms/schemas';
import {
  joinPhone,
  namedCompanionEntries,
  type NamedCompanionInput,
  type PodAttendanceLabels,
  type PodAttendanceRow,
} from '@duncit/utils';

import { DuncitDialog } from '@/components/DuncitDialog';
import { NoticeCard } from '@/components/attendance/NoticeCard';
import { PillButton } from '@/components/attendance/AttendanceOtpControls';
import { ForceCompanionFields } from '@/components/attendance/ForceCompanionFields';
import { formResolver } from '@/utils/form-resolver';

interface Props {
  row: PodAttendanceRow | null;
  labels: PodAttendanceLabels;
  busy: boolean;
  onClose: () => void;
  onConfirm: (row: PodAttendanceRow, companions: readonly NamedCompanionInput[]) => void;
}

/**
 * The Club Admin's by-name mark, behind a warning — the Tamagui twin of the
 * shared MUI `ForceMarkDialog` (rule 27).
 *
 * This writes attendance with no scan and no code behind it, and attendance is
 * what the host is PAID on — so the one thing between this button and a wrong
 * payout is the person pressing it having checked. The sheet therefore restates
 * WHO is about to be marked (name, number, ticket code) rather than only asking
 * "are you sure": a confirm with no subject is a confirm people tap through.
 *
 * It also collects the rest of a multi-seat booking. Those names are optional
 * here — the admin records what the call told them, and the seat is marked
 * either way.
 */
export function ForceMarkSheet({ row, labels, busy, onClose, onConfirm }: Readonly<Props>) {
  const { control, handleSubmit, reset } = useForm<ForceMarkValues, any, ForceMarkValues>({
    resolver: formResolver<ForceMarkValues>(makeForceMarkSchema(labels)),
    defaultValues: forceMarkInitialValues(row?.companions_required ?? 0),
  });

  // A different booking owes a different number of names — never carry the
  // previous attendee's rows onto somebody else's mark.
  useEffect(() => {
    reset(forceMarkInitialValues(row?.companions_required ?? 0));
  }, [row, reset]);

  const phone = row ? joinPhone(row.phone_extension, row.phone_number) : '';
  const detail = [phone, row?.email, row?.ticket_code].filter(Boolean).join(' · ');

  const submit = handleSubmit((values) => {
    if (row) onConfirm(row, namedCompanionEntries(values.companions));
  });

  const footer = (
    <XStack gap={10}>
      <YStack flex={1}>
        <PillButton
          testID="force-mark-cancel"
          label={labels.forceCancel}
          onPress={onClose}
          variant="ghost"
          disabled={busy}
        />
      </YStack>
      <YStack flex={1}>
        <PillButton
          testID="force-mark-confirm"
          label={busy ? labels.marking : labels.forceConfirm}
          onPress={() => {
            submit().catch(() => undefined);
          }}
          variant="solid"
          disabled={busy || !row}
        />
      </YStack>
    </XStack>
  );

  return (
    <DuncitDialog
      open={!!row}
      onClose={onClose}
      testID="force-mark-dialog"
      title={labels.forceTitle}
      closeLabel={labels.forceCancel}
      // Destructive and irreversible: a stray tap on the scrim must not be the
      // thing that decides whether somebody is recorded as having attended.
      dismissOnBackdrop={false}
      footer={footer}
    >
      <YStack gap={12}>
        <NoticeCard tone="warning" title={labels.forceWarning} />
        <YStack gap={2}>
          <Text fontSize={14.5} fontWeight="600" color="$color">
            {row?.name}
          </Text>
          <Text fontSize={12.5} color="$muted">
            {detail}
          </Text>
          {row && row.seats > 1 ? (
            <Text fontSize={12.5} color="$muted">
              {labels.seats(row.seats)}
            </Text>
          ) : null}
        </YStack>
        <ForceCompanionFields control={control} labels={labels} seats={row?.seats ?? 1} />
      </YStack>
    </DuncitDialog>
  );
}
