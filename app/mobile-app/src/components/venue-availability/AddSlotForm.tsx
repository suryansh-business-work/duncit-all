import { useEffect, useState } from 'react';
import { Text, YStack } from 'tamagui';
import {
  checkSlotDraft,
  emptyDraft,
  isDraftIncomplete,
  slotIssueMessage,
  type SlotDraft,
} from '@duncit/slots';

import { DuncitButton } from '@/components/DuncitButton';
import { ConfirmSheet } from '@/components/DuncitDialog';
import type { NewVenueSlotInput } from '@/hooks/useOwnerVenueSlots';
import { useTranslation } from '@/hooks/useTranslation';
import { appNow } from '@/utils/app-formatter';
import { errorCode } from '@/utils/errors';
import { AddSlotFields, type VenueSpace } from './AddSlotFields';

// How often the form re-reads the clock: a window that passes while the sheet
// sits open has to stop being addable on its own, and the pickers only offer
// whole minutes, so half a minute is plenty.
const CLOCK_TICK_MS = 30_000;

/** The application clock, re-read while the form is mounted (rule 11). */
function useNow(): Date {
  const [now, setNow] = useState(() => appNow());
  useEffect(() => {
    const id = setInterval(() => setNow(appNow()), CLOCK_TICK_MS);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** The slot the server is asked for, from a draft that passed the check. */
const toPayload = (
  window: { start: Date; end: Date },
  draft: SlotDraft,
  space: VenueSpace | undefined,
): NewVenueSlotInput => ({
  start_at: window.start.toISOString(),
  end_at: window.end.toISOString(),
  whole_day: draft.wholeDay,
  price: Math.max(0, Math.round(Number(draft.price) || 0)),
  notes: draft.notes,
  space_label: space?.label ?? '',
  capacity: space?.capacity ?? 0,
});

interface Props {
  /** The tapped calendar day — seeds the start/end dates. */
  date: Date;
  spaces: VenueSpace[];
  /** `overwrite` asks the server to delete whatever is already published for
   * that space and time; it is only ever true after the owner confirmed. */
  onCreate: (input: NewVenueSlotInput, overwrite: boolean) => Promise<void>;
}

/**
 * The add-slot form — the Tamagui twin of the MUI AddSlotForm (rule 27).
 *
 * The draft is judged against a live clock on every change, not only on
 * submit, through the same `checkSlotDraft` the MUI form runs. A clash with
 * an already-published slot is the one failure the owner can act on, so the
 * rejected payload is kept and offered back as an overwrite, behind a
 * confirmation that says what that deletes.
 */
export function AddSlotForm({ date, spaces, onCreate }: Readonly<Props>) {
  const { t } = useTranslation();
  const now = useNow();
  const [draft, setDraft] = useState<SlotDraft>(() => emptyDraft(date));
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [clashing, setClashing] = useState<NewVenueSlotInput | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  const patch = (p: Partial<SlotDraft>) => setDraft((d) => ({ ...d, ...p }));
  // Default to the first space so the common case is one tap, not two.
  const activeSpace =
    spaces.length > 0
      ? (spaces.find((space) => space.label === draft.spaceLabel) ?? spaces[0])
      : undefined;

  const checked = checkSlotDraft(draft, now);
  // A half-filled form is not yet wrong, so only a real rejection shows live.
  const liveIssue =
    typeof checked === 'string' && !isDraftIncomplete(checked)
      ? slotIssueMessage(checked, t)
      : null;

  const reset = () => {
    setDraft(emptyDraft(date));
    setError(null);
    setClashing(null);
  };

  /** One send for both attempts — the first try and the confirmed overwrite —
   * so the overwrite re-sends the exact payload the server rejected. */
  const send = async (payload: NewVenueSlotInput, overwrite: boolean) => {
    setCreating(true);
    try {
      await onCreate(payload, overwrite);
      reset();
    } catch (e) {
      setClashing(errorCode(e) === 'CONFLICT' && !overwrite ? payload : null);
      setError(e instanceof Error ? e.message : t('availability.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  // Re-checked against the clock at this instant, not the last tick: a slot
  // must never be created on the strength of a 30-second-old "now".
  const handleAdd = () => {
    setError(null);
    setClashing(null);
    const window = checkSlotDraft(draft, appNow());
    if (typeof window === 'string') {
      setError(slotIssueMessage(window, t));
      return;
    }
    send(toPayload(window, draft, activeSpace), false).catch(() => undefined);
  };

  const handleOverwrite = () => {
    setConfirmOverwrite(false);
    if (clashing) send(clashing, true).catch(() => undefined);
  };

  // A submit/server failure outranks the live hint.
  const message = error ?? liveIssue;

  return (
    <YStack gap={12} paddingTop={12} borderTopWidth={1} borderTopColor="$borderColor">
      <Text fontSize={12} fontWeight="700" color="$muted" letterSpacing={1}>
        {t('availability.addTitle')}
      </Text>
      <AddSlotFields
        draft={draft}
        patch={patch}
        spaces={spaces}
        activeSpace={activeSpace}
        now={now}
      />
      {message ? (
        <Text testID="add-slot-issue" fontSize={12.5} color="$danger">
          {message}
        </Text>
      ) : null}
      {clashing ? (
        <DuncitButton
          testID="add-slot-overwrite"
          label={t('availability.overwriteAction')}
          onPress={() => setConfirmOverwrite(true)}
          variant="outline"
          tone="danger"
          size="sm"
        />
      ) : null}
      <DuncitButton
        testID="add-slot-submit"
        label={creating ? t('availability.adding') : t('availability.addSlot')}
        onPress={handleAdd}
        disabled={creating || !!liveIssue}
        loading={creating}
        fullWidth
      />
      <ConfirmSheet
        open={confirmOverwrite}
        busy={creating}
        testIDPrefix="add-slot-overwrite"
        title={t('availability.overwriteTitle')}
        message={t('availability.overwriteMessage')}
        cancelLabel={t('availability.cancel')}
        confirmLabel={t('availability.overwriteConfirm')}
        busyLabel={t('availability.adding')}
        onCancel={() => setConfirmOverwrite(false)}
        onConfirm={handleOverwrite}
      />
    </YStack>
  );
}
