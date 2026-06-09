import { Alert } from '@mui/material';
import type { RichTestResult } from '../queries';

/** Shared pass/fail banner for the test panels. */
export default function ResultAlert({ result }: Readonly<{ result: RichTestResult | null }>) {
  if (!result) return null;
  return (
    <Alert severity={result.ok ? 'success' : 'error'} sx={{ mt: 1 }}>
      {result.message}
    </Alert>
  );
}
