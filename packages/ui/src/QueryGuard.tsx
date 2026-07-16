import type { ReactNode } from 'react';
import { Alert, CircularProgress, Stack } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { parseApiError } from '@duncit/utils';
import { mergeSx } from './mergeSx';

export interface QueryGuardProps {
  /** Pass `loading && !entity` to keep showing stale data while refetching. */
  loading?: boolean;
  /** The query error (Apollo error, Error, anything) — parsed via parseApiError. */
  error?: unknown;
  /** Precomputed error text; overrides parseApiError (e.g. `error.message`). */
  errorText?: string;
  /** True when the query finished but the entity is missing. */
  notFound?: boolean;
  /** Default 'Not found.'. */
  notFoundText?: ReactNode;
  /** Default 'info' (crm convention); admin/onboarding pass 'warning'. */
  notFoundSeverity?: 'info' | 'warning';
  /** CircularProgress size (default MUI 40). */
  spinnerSize?: number;
  /** Spinner wrapper sx; default `{ py: 6 }`. */
  spinnerSx?: SxProps<Theme>;
  /** Content once loading/error/not-found have all passed. A function defers evaluation. */
  children?: ReactNode | (() => ReactNode);
}

/**
 * The detail/list page query guard trio: centered spinner while loading, an
 * error Alert, a not-found Alert, then the page content.
 */
export function QueryGuard({
  loading,
  error,
  errorText,
  notFound,
  notFoundText = 'Not found.',
  notFoundSeverity = 'info',
  spinnerSize,
  spinnerSx,
  children,
}: Readonly<QueryGuardProps>) {
  if (loading) {
    return (
      <Stack alignItems="center" sx={mergeSx({ py: 6 }, spinnerSx)}>
        <CircularProgress size={spinnerSize} />
      </Stack>
    );
  }
  if (error) {
    return <Alert severity="error">{errorText ?? parseApiError(error)}</Alert>;
  }
  if (notFound) {
    return <Alert severity={notFoundSeverity}>{notFoundText}</Alert>;
  }
  if (typeof children === 'function') return <>{children()}</>;
  return <>{children}</>;
}
