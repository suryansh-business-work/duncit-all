import { useState } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { addDays, isAfter, isBefore, set as setTimeOnDate, startOfDay } from 'date-fns';
import { ConfirmDialog } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import AddSlotFields, { type SlotDraft } from './AddSlotFields';
import { isSlotConflictError } from '../conflict';
import { wholeDayWindow } from '../slot-window';
import type { NewSlotInput, VenueSpace } from '../types';

/** '' is a real value here (whole venue), so the "nothing picked yet" sentinel
 * has to be something a label can never be. */
const NO_SPACE = ' ';

// Mirror the server cap: availability can be published at most this far ahead.
const MAX_FUTURE_DAYS = 60;

const emptyDraft = (date: Date): SlotDraft => ({
  wholeDay: false,
  startDate: date,
  endDate: date,
  startTime: null,
  endTime: null,
  price: '',
  notes: '',
  spaceLabel: NO_SPACE,
});

function combineDateAndTime(date: Date, time: Date): Date {
  return setTimeOnDate(date, {
    hours: time.getHours(),
    minutes: time.getMinutes(),
    seconds: 0,
    milliseconds: 0,
  });
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
 * A clash with an already-published slot is the one failure the partner can act
 * on, so it is not merely reported: the rejected payload is kept and offered
 * back as an overwrite, behind a confirmation naming what that deletes.
 */
export default function AddSlotForm({ date, isHoliday, spaces, onCreate }: Readonly<Props>) {
  const { t } = useTranslation();
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
  const maxDate = addDays(new Date(), MAX_FUTURE_DAYS);

  const reset = () => {
    setDraft(emptyDraft(date));
    setError(null);
    setClashing(null);
  };

  /** The concrete window, or an error message when the form is incomplete. */
  const resolveWindow = (): { start: Date; end: Date } | string => {
    const { startDate, endDate, startTime, endTime, wholeDay } = draft;
    if (!startDate || !endDate) return 'Pick the start and end date.';
    if (isBefore(startOfDay(endDate), startOfDay(startDate))) {
      return 'End date must be on or after the start date.';
    }
    if (wholeDay) return wholeDayWindow(startDate, endDate);
    if (!startTime || !endTime) return 'Pick the start and end time.';
    return {
      start: combineDateAndTime(startDate, startTime),
      end: combineDateAndTime(endDate, endTime),
    };
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
    const window = resolveWindow();
    if (typeof window === 'string') {
      setError(window);
      return;
    }
    const { start, end } = window;
    if (!isAfter(end, start)) {
      setError(t('shell.availability.endAfterStart'));
      return;
    }
    if (!draft.wholeDay && isAfter(new Date(), start)) {
      setError(t('shell.availability.startInFuture'));
      return;
    }
    if (isAfter(start, maxDate)) {
      setError(`Slots can only be scheduled up to ${MAX_FUTURE_DAYS} days ahead.`);
      return;
    }
    await send(
      {
        start_at: start.toISOString(),
        end_at: end.toISOString(),
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

  // Hoisted out of the Alert's props so the conditional sits at nesting 0.
  const overwriteAction = clashing ? (
    <Button color="inherit" size="small" onClick={() => setConfirmOverwrite(true)}>
      {t('shell.availability.overwriteAction')}
    </Button>
  ) : undefined;

  return (
    <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 900 }}>
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
          maxDate={maxDate}
        />
        {error && (
          <Alert severity="error" onClose={() => setError(null)} action={overwriteAction}>
            {error}
          </Alert>
        )}
        <Button variant="contained" disabled={creating} onClick={handleAdd}>
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
