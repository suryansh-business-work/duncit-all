import { useEffect, useState } from 'react';
import { useTranslation } from '@duncit/app-settings';
import {
  checkSlotDraft,
  emptyDraft,
  isDraftIncomplete,
  slotIssueMessage,
  type SlotDraft,
} from '@duncit/slots';
import { isSlotConflictError } from '../../conflict';
import type { NewSlotInput, VenueSpace } from '../../types';

// How often the form re-reads the clock. The whole point of the add form
// validating against "now" is that a window which passes while the drawer sits
// open stops being addable on its own, so the clock cannot be read once at
// mount — a minute is fine, because the pickers only offer whole minutes.
const CLOCK_TICK_MS = 30_000;

/** The current time, re-read while the form is mounted. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => clearInterval(id);
  }, []);
  return now;
}

interface AddSlotFormOptions {
  date: Date;
  spaces: VenueSpace[];
  onCreate: (input: NewSlotInput, overwrite: boolean) => Promise<void>;
}

/** The add form's state: the draft, its live validation, and both sends. */
export function useAddSlotForm({ date, spaces, onCreate }: AddSlotFormOptions) {
  const { t } = useTranslation();
  const now = useNow();
  const [draft, setDraft] = useState<SlotDraft>(() => emptyDraft(date));
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  // The rejected payload, kept so the partner can re-send it as an overwrite
  // without re-typing the slot. Null whenever the last failure was not a clash.
  const [clashing, setClashing] = useState<NewSlotInput | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  const patch = (p: Partial<SlotDraft>) => setDraft((d) => ({ ...d, ...p }));
  // Default to the first space so the common case is one tap, not two.
  const activeSpace =
    spaces.length > 0 ? (spaces.find((s) => s.label === draft.spaceLabel) ?? spaces[0]) : undefined;

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
   *  so the overwrite re-sends the exact payload the server rejected. */
  const send = async (payload: NewSlotInput, overwrite: boolean) => {
    setCreating(true);
    try {
      await onCreate(payload, overwrite);
      reset();
    } catch (e) {
      setClashing(isSlotConflictError(e) && !overwrite ? payload : null);
      setError(e instanceof Error ? e.message : t('availability.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const handleAdd = async () => {
    setError(null);
    setClashing(null);
    // Re-checked against the clock at this instant, not the last tick: a slot
    // must never be created on the strength of a 30-second-old "now".
    const window = checkSlotDraft(draft, new Date());
    if (typeof window === 'string') {
      setError(slotIssueMessage(window, t));
      return;
    }
    await send(
      {
        start_at: window.start.toISOString(),
        end_at: window.end.toISOString(),
        whole_day: draft.wholeDay,
        price: Math.max(0, Math.round(Number(draft.price) || 0)),
        notes: draft.notes,
        space_label: activeSpace?.label ?? '',
        capacity: activeSpace?.capacity ?? 0,
      },
      false,
    );
  };

  const handleOverwrite = async () => {
    setConfirmOverwrite(false);
    if (clashing) await send(clashing, true);
  };

  return {
    t,
    now,
    draft,
    patch,
    activeSpace,
    liveIssue,
    error,
    setError,
    creating,
    clashing,
    confirmOverwrite,
    setConfirmOverwrite,
    handleAdd,
    handleOverwrite,
  };
}
