import Dialog from '@mui/material/Dialog';
import RequestNoteForm from './request-note.form';
import type { RequestNoteFormProps } from './request-note.types';

export type { RequestNoteValues } from './request-note.types';

/** Request Pod: a small dialog around the note form. Closed while `open` is false. */
export default function RequestPodDialog({ open, ...props }: Readonly<RequestNoteFormProps & { open: boolean }>) {
  return (
    <Dialog
      open={open}
      onClose={props.sending ? undefined : props.onCancel}
      aria-labelledby="request-pod-title"
      fullWidth
      maxWidth="sm"
    >
      {open && <RequestNoteForm {...props} />}
    </Dialog>
  );
}
