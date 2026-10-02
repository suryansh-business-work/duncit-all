import { Component, type ErrorInfo, type JSX } from 'react';
import { useLocation } from 'react-router';
import { Alert, AlertTitle, Box, Stack } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DuncitButton } from '@duncit/buttons';
import { createLogger } from '@duncit/logs';
import { useTranslation } from '../i18n/useTranslation';

const logger = createLogger('portal');

interface BoundaryProps {
  /** The current path — moving to another page clears a caught crash. */
  resetKey: string;
  children: JSX.Element;
}

interface BoundaryState {
  error: Error | null;
}

/**
 * Catches a crash in one routed page so the portal chrome stays up and the
 * person gets a message and a way back, instead of a white screen.
 *
 * It sits INSIDE the chrome (see `createAuthed`), so the sidebar still works
 * and navigating away is itself the recovery: the boundary clears when the path
 * changes rather than remounting the page, so a param change inside a working
 * page keeps its state.
 */
class PageBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('PageErrorBoundary', 'componentDidCatch', {
      error,
      msg: 'Portal page render error',
      componentStack: info.componentStack,
    });
  }

  componentDidUpdate(prev: Readonly<BoundaryProps>) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.reset();
  }

  readonly reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) return <ErrorPanel error={this.state.error} onRetry={this.reset} />;
    return this.props.children;
  }
}

/** The visible half. A class cannot call `useTranslation`, so the copy lives here. */
function ErrorPanel({ error, onRetry }: Readonly<{ error: Error; onRetry: () => void }>) {
  const { t } = useTranslation();
  return (
    <Box sx={{ p: 3, maxWidth: 640, mx: 'auto' }}>
      <Alert
        severity="error"
        action={
          <Stack direction="row" spacing={1}>
            <DuncitButton color="inherit" size="small" startIcon={<RefreshIcon />} onClick={onRetry}>
              {t('shell.pageError.tryAgain')}
            </DuncitButton>
            <DuncitButton color="inherit" size="small" onClick={() => globalThis.location.reload()}>
              {t('shell.pageError.reload')}
            </DuncitButton>
          </Stack>
        }
      >
        <AlertTitle>{t('shell.pageError.title')}</AlertTitle>
        {error.message || t('shell.pageError.unexpected')}
      </Alert>
    </Box>
  );
}

export function PageErrorBoundary({ children }: Readonly<{ children: JSX.Element }>) {
  const { pathname } = useLocation();
  return <PageBoundary resetKey={pathname}>{children}</PageBoundary>;
}
