import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import { logs } from '@duncit/logs';
import { isStaleChunkError, reloadForStaleChunk } from './staleChunkReload';

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
    // A route chunk this document can no longer load means a deploy landed
    // under an open tab. Reload once to pick up the new index.html instead of
    // showing a crash screen for a site that is fine — and log it as a warn,
    // because nothing is broken. A second one falls through to the error below.
    const recovering = reloadForStaleChunk(error);
    const level = isStaleChunkError(error) ? 'warn' : 'error';
    logs.mWeb[level]('ErrorBoundary', 'componentDidCatch', {
      error,
      msg: 'ErrorBoundary caught an error',
      componentStack: info.componentStack,
      recovering,
    });
  }

  private readonly reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <Box
        data-testid="error-boundary-fallback"
        sx={{ minHeight: '60dvh', display: 'grid', placeItems: 'center', p: 3 }}
      >
        <Stack
          spacing={2}
          sx={{
            alignItems: "center",
            textAlign: "center"
          }}>
          <ErrorOutlineIcon sx={{ fontSize: 56, color: 'error.main' }} />
          <Typography variant="h5" sx={{
            fontWeight: 700
          }}>
            Something went wrong
          </Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
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
