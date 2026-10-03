import { Alert, Skeleton, Snackbar, Stack } from '@mui/material';

interface Props {
  loading: boolean;
  loadFailed: boolean;
  loadFailedText: string;
  saveFailed: boolean;
  saveFailedText: string;
  saved: boolean;
  savedText: string;
  onDismissSaved: () => void;
}

/** The loading, failure and "saved" states a preference card shares. */
export function SectionStatus({
  loading,
  loadFailed,
  loadFailedText,
  saveFailed,
  saveFailedText,
  saved,
  savedText,
  onDismissSaved,
}: Readonly<Props>) {
  return (
    <>
      {loading && (
        <Stack spacing={1}>
          <Skeleton variant="rounded" height={44} />
          <Skeleton variant="rounded" height={44} />
        </Stack>
      )}
      {loadFailed && <Alert severity="error">{loadFailedText}</Alert>}
      {saveFailed && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {saveFailedText}
        </Alert>
      )}
      <Snackbar open={saved} autoHideDuration={2500} onClose={onDismissSaved} message={savedText} />
    </>
  );
}
