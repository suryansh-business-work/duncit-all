import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import { DuncitButton } from '@duncit/buttons';
import { logs } from '@duncit/logs';
import { useTranslation } from '../i18n/useTranslation';
import { isStaleChunkError, reloadForStaleChunk } from './staleChunkReload';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * The fallback itself, as a function component — a boundary has to be a class,
 * and a class cannot call `useTranslation`. One icon, one line, one way back.
 * Native twin: components/ErrorBoundary (ErrorPanel).
 */
function ErrorPanel({ onRetry }: Readonly<{ onRetry: () => void }>) {
  const { t } = useTranslation();
  return (
    <Box
      data-testid="error-boundary-fallback"
      sx={{ minHeight: '60dvh', display: 'grid', placeItems: 'center', p: 3 }}
    >
      <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
        <Box
          sx={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'background.paper',
          }}
        >
          <ErrorOutlineIcon sx={{ fontSize: 44, color: 'error.main' }} />
        </Box>
        <Typography component="h1" sx={{ fontSize: '1.25rem', fontWeight: 600 }}>
          {t('mweb.errorBoundary.somethingWentWrong')}
        </Typography>
        <DuncitButton data-testid="error-boundary-retry" variant="contained" size="large" onClick={onRetry}>
          {t('mweb.errorBoundary.tryAgain')}
        </DuncitButton>
      </Stack>
    </Box>
  );
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

    return <ErrorPanel onRetry={this.reset} />;
  }
}
