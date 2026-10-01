import { Alert, Box, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { ConfirmDialog } from '@duncit/dialogs';
import { MAX_FUTURE_DAYS } from '@duncit/slots';
import AddSlotFields from '../AddSlotFields';
import type { NewSlotInput, VenueSpace } from '../../types';
import { useAddSlotForm } from './useAddSlotForm';

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
  const {
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
  } = useAddSlotForm({ date, spaces, onCreate });

  // Hoisted out of the Alert's props so the conditionals sit at nesting 0.
  const overwriteAction = clashing ? (
    <DuncitButton
      color="inherit"
      size="small"
      onClick={() => setConfirmOverwrite(true)}
      data-testid="add-slot-overwrite"
    >
      {t('availability.overwriteAction')}
    </DuncitButton>
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
        {t('availability.addTitle')}
      </Typography>
      {isHoliday && (
        <Alert severity="error" data-testid="availability-holiday-alert" sx={{ mt: 1 }}>
          {t('availability.holidayAlert')}
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
          <Alert
            severity={error ? 'error' : 'warning'}
            onClose={dismiss}
            action={overwriteAction}
            data-testid="add-slot-issue"
          >
            {message}
          </Alert>
        )}
        <DuncitButton
          variant="contained"
          disabled={creating || !!liveIssue}
          onClick={handleAdd}
          data-testid="add-slot-submit"
        >
          {creating ? t('availability.adding') : t('availability.addSlot')}
        </DuncitButton>
      </Stack>

      <ConfirmDialog
        open={confirmOverwrite}
        destructive
        title={t('availability.overwriteTitle')}
        message={t('availability.overwriteMessage')}
        confirmLabel={t('availability.overwriteConfirm')}
        cancelLabel={t('availability.cancel')}
        onConfirm={handleOverwrite}
        onClose={() => setConfirmOverwrite(false)}
      />
    </Box>
  );
}
