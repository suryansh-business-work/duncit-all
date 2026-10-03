import type { ReactNode } from 'react';
import { gql } from '@apollo/client';
import { logs } from '@duncit/logs';
import { DuncitErrorBoundary } from '@duncit/ui';
import { ISSUE_REPORT_CATEGORY } from '@duncit/errors';
import { SUBMIT_APP_FEEDBACK_SDL, buildAppFeedbackInput } from '@duncit/slack';
import { buildCrashReportMessage, type BoundaryScope, type CrashReport } from '@duncit/utils';
import { apolloClient } from '../apollo';
import { isStaleChunkError, reloadForStaleChunk } from './staleChunkReload';

const SUBMIT_APP_FEEDBACK = gql(SUBMIT_APP_FEEDBACK_SDL);

/**
 * A route chunk this document can no longer load means a deploy landed under
 * an open tab. Reload once to pick up the new index.html instead of showing a
 * crash screen for a site that is fine — and log it as a warn, because nothing
 * is broken. A second one falls through to the fallback.
 */
function onCaught(error: unknown): 'warn' | 'error' {
  reloadForStaleChunk(error);
  return isStaleChunkError(error) ? 'warn' : 'error';
}

/**
 * Report an Issue also files a support feedback row (Slack + the support
 * table) for a signed-in member. That mutation needs a session, so a
 * signed-out crash is reported through its log row alone.
 */
async function fileFeedback(report: CrashReport): Promise<void> {
  if (!localStorage.getItem('token')) return;
  await apolloClient.mutate({
    mutation: SUBMIT_APP_FEEDBACK,
    variables: {
      input: buildAppFeedbackInput({
        category: ISSUE_REPORT_CATEGORY,
        message: buildCrashReportMessage(report),
        platform: 'web',
        app_version: report.app_version,
        source_screen: report.route,
      }),
    },
  });
}

/**
 * mWeb's error boundary — the shared DuncitErrorBoundary with mWeb's logger,
 * stale-chunk recovery and feedback pipeline. `root` wraps the whole provider
 * tree (main.tsx); the default `page` wraps the routed page (App.tsx), which is
 * remounted per path, so navigating away clears a crash.
 * Native twin: components/ErrorBoundary.
 */
export default function ErrorBoundary({
  children,
  scope = 'page',
}: Readonly<{ children: ReactNode; scope?: BoundaryScope }>) {
  return (
    <DuncitErrorBoundary
      logger={logs.mWeb}
      surface="mWeb"
      scope={scope}
      appVersion={__APP_VERSION__}
      onCaught={onCaught}
      onReport={fileFeedback}
    >
      {children}
    </DuncitErrorBoundary>
  );
}
