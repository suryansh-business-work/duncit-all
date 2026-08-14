import { useCallback, useState } from 'react';
import { logs } from '@duncit/logs';
import {
  ISSUE_LOG_COMPONENT,
  issueLogData,
  parseIssue,
  type ParsedIssue,
} from '@duncit/errors';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * Error state for a screen that runs server operations.
 *
 * `capture(err, operation)` parses whatever was thrown into one structured
 * issue, logs it through the telemetry funnel (which is what fills the Tech
 * portal's Error Logs section), and holds it for an IssueNotice to render.
 */
export function useServerIssue(page: string) {
  const { t } = useTranslation();
  const [issue, setIssue] = useState<ParsedIssue | null>(null);

  const capture = useCallback(
    (err: unknown, operation?: string) => {
      const parsed = parseIssue(err, {
        operation: operation ?? null,
        fallbackMessage: t('mweb.issue.fallback'),
      });
      logs.mWeb.error(page, ISSUE_LOG_COMPONENT, { error: err, ...issueLogData(parsed) });
      setIssue(parsed);
      return parsed;
    },
    [page, t]
  );

  const clear = useCallback(() => setIssue(null), []);
  return { issue, capture, clear };
}
