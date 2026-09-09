import type { ReactNode } from 'react';
import { Alert, Grid, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';

export interface FormActionsRowProps {
  /** The submit button's label. Hidden behind the spinner while `busy`. */
  submitLabel: ReactNode;
  /** Submission in flight — spins the button and blocks a second press. */
  busy?: boolean;
  /** Not submittable yet: invalid, unchanged, or a preview still resolving. */
  disabled?: boolean;
  /** What the last submit failed with; the alert is dropped when empty. */
  errorMessage?: string | null;
  /** Icon on the submit button (Send, Save, …). */
  startIcon?: ReactNode;
  /** Drawn to the left of submit — a Cancel button, typically. */
  secondaryAction?: ReactNode;
}

/**
 * The last two rows of a `<Grid container>` form: the submit failure, then the
 * right-aligned actions.
 *
 * Five forms carried this block verbatim, which is how they came to disagree
 * about whether a submit in flight shows anything at all — the reason it is one
 * component now (rule 40). `busy` is the whole answer to that: it spins the
 * button and disables it, so a slow save cannot be submitted twice.
 *
 * It renders Grid items, so it belongs directly inside the form's own
 * `<Grid container>`.
 */
export function FormActionsRow({
  submitLabel,
  busy,
  disabled,
  errorMessage,
  startIcon,
  secondaryAction,
}: Readonly<FormActionsRowProps>) {
  return (
    <>
      {errorMessage ? (
        <Grid size={12}>
          <Alert severity="error">{errorMessage}</Alert>
        </Grid>
      ) : null}
      <Grid size={12}>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
          {secondaryAction}
          <DuncitButton
            type="submit"
            variant="contained"
            startIcon={startIcon}
            loading={busy}
            disabled={disabled}
          >
            {submitLabel}
          </DuncitButton>
        </Stack>
      </Grid>
    </>
  );
}
