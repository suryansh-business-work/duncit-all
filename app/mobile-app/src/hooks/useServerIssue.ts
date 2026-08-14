import { useCallback, useState } from 'react';

import { logs } from '@duncit/logs';
import {
  ISSUE_LOG_COMPONENT,
  issueLogData,
  issueLogLevel,
  parseIssue,
  type ParsedIssue,
} from '@duncit/errors';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Error state for a screen that runs server operations. mWeb twin.
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
      // Level by who has to act: a refusal the person can fix is a warn, so it
      // neither buries a real fault nor files a bug against a working screen.
      logs.mobileApp[issueLogLevel(parsed)](page, ISSUE_LOG_COMPONENT, {
        error: err,
        ...issueLogData(parsed),
      });
      setIssue(parsed);
      return parsed;
    },
    [page, t],
  );

  const clear = useCallback(() => setIssue(null), []);
  return { issue, capture, clear };
}
