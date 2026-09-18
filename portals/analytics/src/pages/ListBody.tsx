import type { ReactNode } from 'react';
import { Alert, Button } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';

interface Props {
  /** The rows have arrived. */
  ready: boolean;
  loading: boolean;
  error?: unknown;
  onRetry: () => void;
  children: ReactNode;
}

/** A Settings list while it loads, if it failed (with a retry), and once it is in. */
export default function ListBody({ ready, loading, error, onRetry, children }: Readonly<Props>) {
  const { t } = useTranslation();
  if (ready) return <>{children}</>;
  if (error && !loading) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={onRetry}>
            {t('analytics.page.retry')}
          </Button>
        }
      >
        {parseApiError(error)}
      </Alert>
    );
  }
  return <Loader variant="block" />;
}
