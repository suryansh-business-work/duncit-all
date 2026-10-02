import Alert from '@mui/material/Alert';
import { DuncitButton } from '@duncit/buttons';

/** A failed fetch, with the one thing to do about it. */
export function TableErrorAlert({ error, onRetry }: Readonly<{ error: string; onRetry: () => void }>) {
  return (
    <Alert
      severity="error"
      sx={{ m: 1.5 }}
      action={
        <DuncitButton color="inherit" size="small" onClick={onRetry}>
          Retry
        </DuncitButton>
      }
    >
      {error}
    </Alert>
  );
}
