import type { ReactNode } from 'react';
import { Alert } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from './i18n/useTranslation';
import { Loader } from './loader';

export interface QueryGuardProps {
  /** Pass `loading && !entity` to keep showing stale data while refetching. */
  loading?: boolean;
  /** The query error (Apollo error, Error, anything) — parsed via parseApiError. */
  error?: unknown;
  /** Precomputed error text; overrides parseApiError (e.g. `error.message`). */
  errorText?: string;
  /** True when the query finished but the entity is missing. */
  notFound?: boolean;
  /** Defaults to the shared `Not found.` copy in the reader's language. */
  notFoundText?: ReactNode;
  /** Default 'info' (crm convention); admin/onboarding pass 'warning'. */
  notFoundSeverity?: 'info' | 'warning';
  /** Spinner diameter (default 40). */
  spinnerSize?: number;
  /** Spinner wrapper sx; default `{ py: 6 }`. */
  spinnerSx?: SxProps<Theme>;
  /** What is loading, for the screen reader. Defaults to the shared `Loading…`. */
  loadingLabel?: string;
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
  notFoundText,
  notFoundSeverity = 'info',
  spinnerSize,
  spinnerSx,
  loadingLabel,
  children,
}: Readonly<QueryGuardProps>) {
  const { t } = useTranslation();
  if (loading) {
    return <Loader size={spinnerSize} label={loadingLabel} sx={spinnerSx} />;
  }
  if (error) {
    return <Alert severity="error">{errorText ?? parseApiError(error)}</Alert>;
  }
  if (notFound) {
    return <Alert severity={notFoundSeverity}>{notFoundText ?? t('ui.queryGuard.notFound')}</Alert>;
  }
  if (typeof children === 'function') return <>{children()}</>;
  return <>{children}</>;
}
