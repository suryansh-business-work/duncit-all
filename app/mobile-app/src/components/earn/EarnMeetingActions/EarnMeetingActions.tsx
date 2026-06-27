import { useState } from 'react';
import { Text, XStack } from 'tamagui';

import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';
import {
  CancelMyMeetingDocument,
  MeetingSlotsDocument,
  RescheduleMyMeetingDocument,
  type MeetingSlot,
  type MeetingSlotsResult,
  type SurveyKind,
} from '@/graphql/onboarding-survey';
import { ActionButton } from './ActionButton';
import { RescheduleDialog } from './RescheduleDialog';
import { CancelDialog } from './CancelDialog';

interface Props {
  kind: string;
  /** Times the meeting has been rescheduled — reschedule is one-time. */
  rescheduleCount?: number | null;
  /** The meeting's booked slot — shown for reference in the reschedule picker. */
  currentSlot?: string | null;
  /** Called after a successful reschedule/cancel so the screen can refetch. */
  onChanged: () => void;
}

const RESCHEDULE_LIMIT_MESSAGE = 'You have already used your one-time reschedule option.';

/** Reschedule / cancel actions for an Earn card with a pending onboarding
 * meeting — the Tamagui twin of mWeb's EarnMeetingActions. Reschedule is a
 * one-time option; both actions require a reason. */
export function EarnMeetingActions({
  kind,
  rescheduleCount,
  currentSlot,
  onChanged,
}: Readonly<Props>) {
  const canReschedule = (rescheduleCount ?? 0) < 1;
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [slots, setSlots] = useState<MeetingSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slot, setSlot] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeReschedule = () => setRescheduleOpen(false);
  const closeCancel = () => setCancelOpen(false);

  const openReschedule = () => {
    setError(null);
    setSlot('');
    setReason('');
    setRescheduleOpen(true);
    setSlotsLoading(true);
    graphqlRequest<MeetingSlotsResult, { kind: SurveyKind }>(
      MeetingSlotsDocument,
      { kind: kind as SurveyKind },
      { auth: true },
    )
      .then((res) => setSlots(res.meetingSlots))
      .catch((e) => setError(toErrorMessage(e, 'Could not load the available slots')))
      .finally(() => setSlotsLoading(false));
  };

  const openCancel = () => {
    setError(null);
    setReason('');
    setCancelOpen(true);
  };

  const reschedule = async () => {
    if (!slot) {
      setError('Pick an available slot');
      return;
    }
    if (!reason.trim()) {
      setError('Please tell us why you are rescheduling');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await graphqlRequest(
        RescheduleMyMeetingDocument,
        { kind, requested_at: slot, reason: reason.trim() },
        { auth: true },
      );
      setRescheduleOpen(false);
      onChanged();
    } catch (e) {
      setError(toErrorMessage(e, 'Could not reschedule — please try again'));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!reason.trim()) {
      setError('Please tell us why you are cancelling');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await graphqlRequest(
        CancelMyMeetingDocument,
        { kind, reason: reason.trim() },
        { auth: true },
      );
      setCancelOpen(false);
      onChanged();
    } catch (e) {
      setError(toErrorMessage(e, 'Could not cancel — please try again'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <XStack gap={8} paddingTop={2} flexWrap="wrap" alignItems="center">
      {canReschedule ? (
        <ActionButton
          testID={`reschedule-${kind}`}
          label="Reschedule meeting"
          onPress={openReschedule}
        />
      ) : (
        <Text testID={`reschedule-used-${kind}`} fontSize={11.5} color="$muted" flex={1}>
          {RESCHEDULE_LIMIT_MESSAGE}
        </Text>
      )}
      <ActionButton testID={`cancel-${kind}`} label="Cancel meeting" danger onPress={openCancel} />

      <RescheduleDialog
        open={rescheduleOpen}
        slots={slots}
        slotsLoading={slotsLoading}
        slot={slot}
        onPickSlot={setSlot}
        currentSlot={currentSlot}
        reason={reason}
        onChangeReason={setReason}
        busy={busy}
        error={error}
        onClose={closeReschedule}
        onConfirm={() => void reschedule()}
      />

      <CancelDialog
        open={cancelOpen}
        reason={reason}
        onChangeReason={setReason}
        busy={busy}
        error={error}
        onClose={closeCancel}
        onConfirm={() => void cancel()}
      />
    </XStack>
  );
}
