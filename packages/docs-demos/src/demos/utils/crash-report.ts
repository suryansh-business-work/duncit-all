import {
  BOUNDARY_LOG_COMPONENT,
  buildCrashReport,
  buildCrashReportMessage,
  crashLogData,
  redactSensitive,
} from '@duncit/utils';
import { defineDemo, type PackageDemo } from '../../types';

interface CrashMock {
  message: string;
  route: string;
  scope: 'root' | 'page';
  surface: string;
}

export const crashReportDemos: PackageDemo[] = [
  defineDemo<CrashMock>({
    id: 'crash-report',
    title: 'buildCrashReport — what an error boundary sends, scrubbed first',
    note:
      'Put a token, an email or a phone number in message and watch it come back redacted; put a query string on route and only the path survives. logData is what lands in TelemetryLog.data under the errorBoundary marker — the Tech portal’s Error Boundaries page reads exactly these keys — and feedback is the body a signed-in Report an Issue files with support.',
    mock: {
      message: 'Request failed for asha@example.com with token=abc123secret, call +91 98765 43210',
      route: '/pods/DUN-POD-4688?invite=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl',
      scope: 'page',
      surface: 'mWeb',
    },
    compute: (mock) => {
      const report = buildCrashReport({
        error: new Error(mock.message),
        scope: mock.scope,
        route: mock.route,
        surface: mock.surface,
        platform: 'web',
        appVersion: '1.81.6',
        now: new Date('2026-10-03T10:00:00.000Z'),
      });
      return {
        marker: BOUNDARY_LOG_COMPONENT,
        redacted: redactSensitive(mock.message),
        report,
        logData: crashLogData(report, 'CAUGHT'),
        feedback: buildCrashReportMessage(report),
      };
    },
  }),
];
