import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Alert, AlertTitle, Box, Button, Stack } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

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
    // eslint-disable-next-line no-console
    console.error('CRM render error:', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <Box sx={{ p: 3, maxWidth: 640, mx: 'auto' }}>
          <Alert
            severity="error"
            action={
              <Stack direction="row" spacing={1}>
                <Button color="inherit" size="small" startIcon={<RefreshIcon />} onClick={this.reset}>
                  Try again
                </Button>
                <Button color="inherit" size="small" onClick={() => window.location.reload()}>
                  Reload
                </Button>
              </Stack>
            }
          >
            <AlertTitle>Something went wrong</AlertTitle>
            {this.state.error.message || 'An unexpected error occurred. Try again or reload the page.'}
          </Alert>
        </Box>
      );
    }
    return this.props.children;
  }
}
