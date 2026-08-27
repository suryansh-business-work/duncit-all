import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Alert, AlertTitle, Box, Stack } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DuncitButton } from '@duncit/buttons';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * App-level error boundary. Catches render crashes (e.g. a flaky third-party
 * widget) and shows a recoverable message instead of a blank "application
 * error" screen, with a button to retry without a full reload.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logs.portal['crm'].error('ErrorBoundary', 'componentDidCatch', {
      error,
      msg: 'CRM render error',
      componentStack: info.componentStack,
    });
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return <ErrorPanel error={this.state.error} onRetry={this.reset} />;
    }
    return this.props.children;
  }
}

/** The visible half of the boundary. A class cannot call useTranslation, so
 *  everything a person reads is rendered from here instead. */
function ErrorPanel({ error, onRetry }: Readonly<{ error: Error; onRetry: () => void }>) {
  const { t } = useTranslation();
  return (
    <Box sx={{ p: 3, maxWidth: 640, mx: 'auto' }}>
      <Alert
        severity="error"
        action={
          <Stack direction="row" spacing={1}>
            <DuncitButton color="inherit" size="small" startIcon={<RefreshIcon />} onClick={onRetry}>
              {t('crm.components.tryAgain')}
            </DuncitButton>
            <DuncitButton color="inherit" size="small" onClick={() => globalThis.location.reload()}>
              {t('crm.components.reload')}
            </DuncitButton>
          </Stack>
        }
      >
        <AlertTitle>{t('crm.components.somethingWentWrong')}</AlertTitle>
        {error.message || t('crm.components.unexpectedError')}
      </Alert>
    </Box>
  );
}
