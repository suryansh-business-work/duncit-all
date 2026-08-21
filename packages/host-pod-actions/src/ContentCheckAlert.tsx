import { Alert, AlertTitle, Stack } from '@mui/material';
import type { PodContentViolation } from '@duncit/utils';

interface Props {
  violations: PodContentViolation[];
  title: string;
}

/**
 * What the AI content check refused, one line per rule broken. The wording is
 * the server's: the same sentence the create-pod stepper shows, so a host reads
 * one explanation of the guidelines and not a per-screen paraphrase.
 */
export default function ContentCheckAlert({ violations, title }: Readonly<Props>) {
  if (violations.length === 0) return null;
  return (
    <Alert severity="warning" data-testid="pod-content-check">
      <AlertTitle>{title}</AlertTitle>
      <Stack component="ul" sx={{ m: 0, pl: 2.5 }} spacing={0.25}>
        {violations.map((violation) => (
          <li key={`${violation.field}-${violation.type}-${violation.message}`}>
            {violation.message}
            {violation.evidence ? ` (“${violation.evidence}”)` : ''}
          </li>
        ))}
      </Stack>
    </Alert>
  );
}
