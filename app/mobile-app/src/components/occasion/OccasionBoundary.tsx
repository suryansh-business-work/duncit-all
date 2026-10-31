import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logs } from '@duncit/logs';

interface State {
  failed: boolean;
}

/**
 * Wraps the festive decoration. Decoration is never worth a broken app: a
 * crash in here is logged for developers and the decoration simply goes away,
 * while the screens underneath carry on under their own error boundaries.
 * Keyed by the look, so the next look gets a fresh chance.
 */
export class OccasionBoundary extends Component<Readonly<{ children: ReactNode }>, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    logs.mobileApp.error('occasion', 'OccasionBoundary', {
      error,
      componentStack: info.componentStack,
    });
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}
