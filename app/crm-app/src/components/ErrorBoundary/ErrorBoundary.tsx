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

import { appVersion, submitFeedback } from '@/services/feedback';
import { getToken } from '@/services/session';
import { ErrorPanel } from './ErrorPanel';

interface Props {
  children: ReactNode;
  /** `root` wraps the whole app; `page` (default) one screen. */
  scope?: BoundaryScope;
  /** The screen it wraps. */
  route: string;
}

interface State {
  error: Error | null;
  report: CrashReport | null;
}

/**
 * The Duncit error boundary for the CRM app — the Tamagui twin of the shared
 * DuncitErrorBoundary, building the same scrubbed report from @duncit/utils,
 * so a crash lands in Tech → Error Boundaries like every other surface. One
 * around the app and one around every screen: a broken screen never takes the
 * dialer or the caller ID down with it. Retry remounts the screen; Report an
 * Issue files a support row for the signed-in person.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, report: null };

  private reportedId: string | null = null;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    const report = buildCrashReport({
      error,
      componentStack: info.componentStack,
      scope: this.props.scope ?? 'page',
      route: `crm-app/${this.props.route}`,
      surface: 'mobileApp',
      platform: Platform.OS,
      appVersion: appVersion(),
    });
    logs.mobileApp.error(report.route, BOUNDARY_LOG_COMPONENT, { error: crashLogError(report), ...crashLogData(report, 'CAUGHT') });
    this.setState({ report });
  }

  private readonly reset = () => this.setState({ error: null, report: null });

  private readonly report = async () => {
    const { report } = this.state;
    if (!report) return;
    if (this.reportedId !== report.crash_id) {
      this.reportedId = report.crash_id;
      logs.mobileApp.warn(report.route, BOUNDARY_LOG_COMPONENT, { error: crashLogError(report), ...crashLogData(report, 'REPORTED') });
    }
    // Filing a feedback row needs a session; a signed-out crash is reported by its log alone.
    if (await getToken()) await submitFeedback(ISSUE_REPORT_CATEGORY, buildCrashReportMessage(report), report.route);
  };

  override render() {
    if (!this.state.error) return this.props.children;
    return <ErrorPanel reference={this.state.report?.crash_id} onRetry={this.reset} onReport={this.report} />;
  }
}
