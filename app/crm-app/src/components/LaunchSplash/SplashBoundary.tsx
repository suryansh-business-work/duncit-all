import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logs } from '@duncit/logs';

import { hideNativeSplash } from './LaunchSplash';

interface Props {
  children: ReactNode;
  /** Called when the splash breaks, so the app shows straight away. */
  onFail: () => void;
}

/**
 * The launch video's own error boundary. A broken splash must never cover the
 * app with an error panel (the app's ErrorBoundary would): it logs, puts the
 * native splash away and gets out of the way.
 */
export class SplashBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    logs.mobileApp.warn('crm-app/LaunchSplash', 'crash', {
      error,
      componentStack: info.componentStack ?? '',
      msg: 'The launch video failed; the app opened without it',
    });
    hideNativeSplash();
    this.props.onFail();
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}
