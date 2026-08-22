import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Alert, AlertTitle } from '@mui/material';

interface Props {
  children: ReactNode;
  /** Re-mounts the subtree when the mock changes, so a fixed edit recovers. */
  resetKey: string;
  /** Localized heading. Passed in because an error boundary must be a class,
   * and a class cannot call the translation hook. */
  title: string;
}

interface State {
  message: string;
}

/**
 * Keeps one broken demo from taking the page with it.
 *
 * The mock data below every demo is editable, which means a reader can and will
 * hand a component something it cannot render — that is the point of a sandbox.
 * The failure belongs inside the card, next to the data that caused it, rather
 * than as a blank screen with a console message.
 */
export default class DemoBoundary extends Component<Props, State> {
  state: State = { message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return { message: error instanceof Error ? error.message : String(error) };
  }

  componentDidUpdate(prev: Props): void {
    if (prev.resetKey !== this.props.resetKey && this.state.message) {
      this.setState({ message: '' });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Kept to the console on purpose: the card shows the message, the console
    // keeps the stack a developer needs to place it.
    console.error('[package demo]', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.message) {
      return (
        <Alert severity="error" variant="outlined">
          <AlertTitle>{this.props.title}</AlertTitle>
          {this.state.message}
        </Alert>
      );
    }
    return this.props.children;
  }
}
