import type { ReactNode } from 'react';
import { Alert, CircularProgress, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { fireAndForget } from '@duncit/logs';
import { loyaltyLog } from '../../lib/logger';

interface Props {
  loading: boolean;
  /** The query failed — shown with a retry, never swallowed. */
  error: unknown;
  /** The query answered but the record is gone (a NOT_FOUND error or no data). */
  notFound: boolean;
  /** Re-reads the record; a failed retry is logged and the error state stays. */
  onRetry: () => Promise<unknown>;
  children: ReactNode;
}

/** True when the server said the record does not exist, rather than failing. */
export const isNotFoundError = (error: unknown): boolean =>
  Boolean(
    (error as { errors?: Array<{ extensions?: { code?: string } }> } | null)?.errors?.some(
      (e) => e.extensions?.code === 'NOT_FOUND'
    )
  );

/**
 * The three states a record page has before it has a record: loading, failed
 * (with a retry) and gone. Only once all three are ruled out do the children
 * render, so a detail page never reads a half-loaded record.
 */
export default function DetailPageState({ loading, error, notFound, onRetry, children }: Readonly<Props>) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <Stack sx={{ alignItems: 'center', py: 6 }} role="status" aria-label={t('loyalty.common.loading')}>
        <CircularProgress />
      </Stack>
    );
  }
  if (notFound) {
    return <Alert severity="warning">{t('loyalty.common.notFound')}</Alert>;
  }
  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <DuncitButton
            color="inherit"
            size="small"
            onClick={() => fireAndForget(onRetry(), loyaltyLog, 'DetailPageState', 'retry')}
          >
            {t('loyalty.common.retry')}
          </DuncitButton>
        }
      >
        {t('loyalty.common.loadError')}
      </Alert>
    );
  }
  return <>{children}</>;
}
