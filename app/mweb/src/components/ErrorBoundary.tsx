import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * App-wide error boundary — catches render/runtime errors anywhere in the tree
 * and shows a recoverable fallback instead of a blank screen. mWeb twin of the
 * mobile ErrorBoundary.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error', error, info.componentStack);
  }

  private readonly reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <Box
        data-testid="error-boundary-fallback"
        sx={{ minHeight: '60dvh', display: 'grid', placeItems: 'center', p: 3 }}
      >
        <Stack spacing={2} alignItems="center" textAlign="center">
          <ErrorOutlineIcon sx={{ fontSize: 56, color: '#b3261e' }} />
          <Typography variant="h5" fontWeight={900}>
            Something went wrong
          </Typography>
          <Typography variant="body2" color="text.secondary">
            An unexpected error occurred. Please try again.
          </Typography>
          <Button data-testid="error-boundary-retry" variant="contained" onClick={this.reset}>
            Try again
          </Button>
        </Stack>
      </Box>
    );
  }
}
