import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { logs } from '@duncit/logs';
import { ISSUE_REPORT_CATEGORY } from '@duncit/errors';
import {
  BOUNDARY_LOG_COMPONENT,
  buildCrashReport,
  buildCrashReportMessage,
  crashLogData,
  crashLogError,
  type BoundaryScope,
  type CrashReport,
} from '@duncit/utils';
import { submitAppFeedback } from '@/hooks/useFeedback';
import { navigationRef } from '@/navigation/navigationRef';
import { useAuthStore } from '@/stores/auth.store';
import { appVersion } from '@/utils/app-version';
import { ErrorPanel } from './ErrorPanel';

interface Props {
  children: ReactNode;
  /** `root` wraps the whole app; `page` (default) one screen, via the navigators' screenLayout. */
  scope?: BoundaryScope;
  /** The screen it wraps. The root boundary reads the focused route instead. */
  route?: string;
}

interface State {
  error: Error | null;
  /** Built in componentDidCatch, once the component stack is known. */
  report: CrashReport | null;
}

/**
 * Report an Issue also files a support feedback row for a signed-in member.
 * That mutation needs a session, so a signed-out crash is reported through its
 * log row alone.
 */
async function fileFeedback(report: CrashReport): Promise<void> {
  if (!useAuthStore.getState().token) return;
  await submitAppFeedback(ISSUE_REPORT_CATEGORY, buildCrashReportMessage(report), [], report.route);
}

/**
 * The native error boundary — Tamagui twin of the shared DuncitErrorBoundary
 * (@duncit/ui) that mWeb and the portals use, building the same scrubbed
 * report from @duncit/utils so a crash lands in Tech → Error Boundaries the
 * same way. Mounted at the root (App.tsx) and around every screen
 * (screenLayout), so one broken screen leaves the rest of the app working.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, report: null };

  /** Report pressed again after a failed send must not file the crash twice. */
  private reportedId: string | null = null;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    const report = buildCrashReport({
      error,
      componentStack: info.componentStack,
      scope: this.props.scope ?? 'page',
      route: this.props.route ?? navigationRef.getCurrentRoute()?.name ?? '',
      surface: 'mobileApp',
      platform: Platform.OS,
      appVersion: appVersion(),
    });
    logs.mobileApp.error(report.route, BOUNDARY_LOG_COMPONENT, {
      error: crashLogError(report),
      ...crashLogData(report, 'CAUGHT'),
    });
    this.setState({ report });
  }

  private readonly reset = () => this.setState({ error: null, report: null });

  private readonly report = async () => {
    const { report } = this.state;
    if (!report) return;
    if (this.reportedId !== report.crash_id) {
      this.reportedId = report.crash_id;
      logs.mobileApp.warn(report.route, BOUNDARY_LOG_COMPONENT, {
        error: crashLogError(report),
        ...crashLogData(report, 'REPORTED'),
      });
    }
    await fileFeedback(report);
  };

  override render() {
    if (!this.state.error) return this.props.children;
    return <ErrorPanel reference={this.state.report?.crash_id} onRetry={this.reset} onReport={this.report} />;
  }
}
