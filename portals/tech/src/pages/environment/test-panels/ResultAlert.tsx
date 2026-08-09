import { Alert, AlertTitle, List, ListItem, ListItemText } from '@mui/material';

/**
 * What any test in this drawer reports back. Wider than one mutation's payload
 * on purpose — the rich tests answer with a URL or a data blob, the connection
 * test answers with a list of findings, and both land in the same banner.
 */
export interface TestOutcome {
  ok: boolean;
  message: string;
  details?: string[] | null;
}

/** Shared pass/fail banner for the test panels. */
export default function ResultAlert({ result }: Readonly<{ result: TestOutcome | null }>) {
  if (!result) return null;
  const details = result.details ?? [];
  return (
    <Alert severity={result.ok ? 'success' : 'error'} sx={{ mt: 1 }}>
      {details.length > 0 ? <AlertTitle>{result.message}</AlertTitle> : result.message}
      {details.length > 0 && (
        <List dense disablePadding>
          {details.map((line) => (
            <ListItem key={line} disableGutters sx={{ py: 0 }}>
              <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={line} />
            </ListItem>
          ))}
        </List>
      )}
    </Alert>
  );
}
