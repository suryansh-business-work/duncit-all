import { Component, type ErrorInfo, type ReactNode } from 'react';
import {
  BOUNDARY_LOG_COMPONENT,
  buildCrashReport,
  crashLogData,
  crashLogError,
  type BoundaryScope,
  type CrashReport,
} from '@duncit/utils';
import { ErrorFallback } from './ErrorFallback';

type LogFn = (page: string, component: string, detail?: Record<string, unknown>) => void;

/** The two levels the boundary writes — `logs.mWeb` or a `createLogger(...)` result fits. */
export interface BoundaryLogger {
  error: LogFn;
  warn: LogFn;
}

export interface DuncitErrorBoundaryProps {
  children: ReactNode;
  logger: BoundaryLogger;
  /** Who crashed — `mWeb`, or the portal key. */
  surface: string;
  /** `root` wraps the whole app, so Retry reloads it; `page` (default) re-renders just the page. */
  scope?: BoundaryScope;
  /** A new value (the path) clears a caught crash — navigating away is itself a recovery. */
  resetKey?: string;
  appVersion?: string;
  /**
   * Files the report where a person reads it (the support feedback pipeline).
   * The REPORTED log row the Tech portal lists is written either way.
   */
  onReport?: (report: CrashReport) => Promise<unknown>;
  /**
   * Runs once per crash, before it is logged. May start a recovery of its own
   * (mWeb reloads for a stale chunk) and returns the level to log at.
   */
  onCaught?: (error: unknown) => 'warn' | 'error';
}

interface State {
  error: Error | null;
  /** Built in componentDidCatch, once the component stack is known. */
  report: CrashReport | null;
}

const currentPath = () => globalThis.location?.pathname ?? '';

/**
 * The one error boundary for mWeb and every portal: a crash in what it wraps
 * shows a way forward (Retry, Report an Issue) instead of a blank screen, and
 * lands in the Tech portal's Error Boundaries page — scrubbed of tokens and
 * personal data first. Native's Tamagui twin builds the same report.
 */
export class DuncitErrorBoundary extends Component<DuncitErrorBoundaryProps, State> {
  state: State = { error: null, report: null };

  /** Report pressed again after a failed send must not file the crash twice. */
  private reportedId: string | null = null;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const level = this.props.onCaught?.(error) ?? 'error';
    const report = buildCrashReport({
      error,
      componentStack: info.componentStack,
      scope: this.props.scope ?? 'page',
      route: currentPath(),
      surface: this.props.surface,
      platform: 'web',
      appVersion: this.props.appVersion,
    });
    this.props.logger[level](report.route, BOUNDARY_LOG_COMPONENT, {
      error: crashLogError(report),
      ...crashLogData(report, 'CAUGHT'),
    });
    this.setState({ report });
  }

  componentDidUpdate(prev: Readonly<DuncitErrorBoundaryProps>) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.reset();
  }

  private readonly reset = () => this.setState({ error: null, report: null });

  private readonly retry = () => {
    if (this.props.scope === 'root') globalThis.location.reload();
    else this.reset();
  };

  private readonly report = async () => {
    const { report } = this.state;
    if (!report) return;
    if (this.reportedId !== report.crash_id) {
      this.reportedId = report.crash_id;
      this.props.logger.warn(report.route, BOUNDARY_LOG_COMPONENT, {
        error: crashLogError(report),
        ...crashLogData(report, 'REPORTED'),
      });
    }
    await this.props.onReport?.(report);
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <ErrorFallback
        reference={this.state.report?.crash_id}
        fullScreen={this.props.scope === 'root'}
        onRetry={this.retry}
        onReport={this.report}
      />
    );
  }
}
