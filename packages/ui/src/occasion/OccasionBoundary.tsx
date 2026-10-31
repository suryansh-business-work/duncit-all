import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface OccasionBoundaryProps {
  children: ReactNode;
  /** Where the failure is reported — the host's structured logger. */
  onError: (error: Error, info: ErrorInfo) => void;
}

interface State {
  failed: boolean;
}

/**
 * Wraps festive decoration. Decoration is never worth a broken screen, so a
 * crash inside it is logged for developers and the decoration simply goes
 * away — the page underneath carries on, keeping its own error boundary for
 * real failures.
 */
export class OccasionBoundary extends Component<OccasionBoundaryProps, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError(error, info);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
