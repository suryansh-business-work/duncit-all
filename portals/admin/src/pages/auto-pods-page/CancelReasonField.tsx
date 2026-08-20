import { DialogContentText, Stack, TextField } from '@mui/material';

interface CancelReasonFieldProps {
  message: string;
  label: string;
  onReasonChange: (value: string) => void;
}

/**
 * The body of the cancel confirmation: what cancelling does, plus an optional
 * reason.
 *
 * The field is uncontrolled and reports each keystroke into a ref the page owns,
 * rather than holding the text here or reading it back off a DOM ref. The shared
 * `useConfirm` clears its message the moment the confirm button is pressed, so
 * this subtree is already unmounted by the time the awaiting caller resumes —
 * a value read after that point is always null.
 */
export default function CancelReasonField({
  message,
  label,
  onReasonChange,
}: Readonly<CancelReasonFieldProps>) {
  return (
    <Stack spacing={2}>
      <DialogContentText>{message}</DialogContentText>
      <TextField
        label={label}
        size="small"
        fullWidth
        multiline
        minRows={2}
        onChange={(event) => onReasonChange(event.target.value)}
      />
    </Stack>
  );
}
