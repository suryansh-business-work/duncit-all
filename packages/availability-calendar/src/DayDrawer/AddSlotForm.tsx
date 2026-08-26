import { useEffect, useState } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { ConfirmDialog } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import AddSlotFields from './AddSlotFields';
import { isSlotConflictError } from '../conflict';
import {
  checkSlotDraft,
  emptyDraft,
  isDraftIncomplete,
  slotIssueMessage,
  MAX_FUTURE_DAYS,
  type SlotDraft,
} from '../slot-draft';
import type { NewSlotInput, VenueSpace } from '../types';

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

interface Props {
  /** The clicked calendar date — seeds the start/end dates. */
  date: Date;
  isHoliday: boolean;
  spaces: VenueSpace[];
  /**
   * `overwrite` asks the server to delete whatever is already published for
   * that space and time and put this slot in its place. It is only ever true
   * after the partner confirmed the warning that says so.
   */
  onCreate: (input: NewSlotInput, overwrite: boolean) => Promise<void>;
}

/**
 * The simplified add form: a Whole-day toggle plus start date & time and end
 * date & time. Same-date = a single-day slot; a later end date = ONE continuous
 * multi-day (activity) booking. Whole-day hides the clocks and books the
 * entire date range.
 *
 * Validation runs on every keystroke against a live clock, not only on submit:
 * an already-passed time, an end equal to or before the start, or a date beyond
 * the publishing window shows the reason inline and keeps Add disabled. The
 * pickers refuse those values too (`minTime`), so the message is a second line
 * of defence rather than the first.
 *
 * A clash with an already-published slot is the one failure the partner can act
 * on, so it is not merely reported: the rejected payload is kept and offered
 * back as an overwrite, behind a confirmation naming what that deletes.
 */
export default function AddSlotForm({ date, isHoliday, spaces, onCreate }: Readonly<Props>) {
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
      setError(e instanceof Error ? e.message : t('shell.availability.createFailed'));
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

  // Hoisted out of the Alert's props so the conditionals sit at nesting 0.
  const overwriteAction = clashing ? (
    <Button color="inherit" size="small" onClick={() => setConfirmOverwrite(true)}>
      {t('shell.availability.overwriteAction')}
    </Button>
  ) : undefined;
  // A submit/server failure outranks the live hint, and only it is dismissable
  // — a live issue would simply come straight back.
  const message = error ?? liveIssue;
  const dismiss = error ? () => setError(null) : undefined;

  return (
    <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
      <Typography
        variant="overline"
        sx={{
          color: "text.secondary",
          fontWeight: 900
        }}>
        Add availability
      </Typography>
      {isHoliday && (
        <Alert severity="error" sx={{ mt: 1 }}>
          This date is marked as a venue leave/holiday — slots cannot be added or booked.
        </Alert>
      )}
      <Stack spacing={1.5} sx={{ mt: 1, display: isHoliday ? 'none' : 'flex' }}>
        <AddSlotFields
          draft={draft}
          patch={patch}
          spaces={spaces}
          activeSpace={activeSpace}
          now={now}
          maxFutureDays={MAX_FUTURE_DAYS}
        />
        {message && (
          <Alert severity={error ? 'error' : 'warning'} onClose={dismiss} action={overwriteAction}>
            {message}
          </Alert>
        )}
        <Button variant="contained" disabled={creating || !!liveIssue} onClick={handleAdd}>
          {creating ? 'Adding…' : 'Add slot'}
        </Button>
      </Stack>

      <ConfirmDialog
        open={confirmOverwrite}
        destructive
        title={t('shell.availability.overwriteTitle')}
        message={t('shell.availability.overwriteMessage')}
        confirmLabel={t('shell.availability.overwriteConfirm')}
        cancelLabel={t('shell.common.cancel')}
        onConfirm={handleOverwrite}
        onClose={() => setConfirmOverwrite(false)}
      />
    </Box>
  );
}
