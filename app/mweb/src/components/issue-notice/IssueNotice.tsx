import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { Alert } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import {
  ISSUE_REPORT_CATEGORY,
  buildIssueReportMessage,
  type ParsedIssue,
} from '@duncit/errors';
import { SUBMIT_APP_FEEDBACK_SDL, buildAppFeedbackInput } from '@duncit/slack';
import { useTranslation } from '../../i18n/useTranslation';

const SUBMIT_APP_FEEDBACK = gql(SUBMIT_APP_FEEDBACK_SDL);

/**
 * A server-operation failure, said properly, with a way to tell somebody.
 *
 * The message is the parsed issue's own (server-written when there is one).
 * The Report button rides the existing feedback pipeline — identity is
 * server-stamped, the report lands in Slack and the support feedback table —
 * and only shows when the issue is the platform's to hear about, never for a
 * validation refusal the person can fix themselves.
 */
export default function IssueNotice({
  issue,
  page,
  onClose,
}: Readonly<{ issue: ParsedIssue; page: string; onClose?: () => void }>) {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const [submit, { loading }] = useMutation(SUBMIT_APP_FEEDBACK);

  const report = async () => {
    try {
      await submit({
        variables: {
          input: buildAppFeedbackInput({
            category: ISSUE_REPORT_CATEGORY,
            message: buildIssueReportMessage(issue, { surface: 'mWeb', page }),
            platform: 'web',
            source_screen: page,
          }),
        },
      });
      setSent(true);
    } catch {
      // The report is best-effort; the original failure stays on screen.
    }
  };

  const action = (() => {
    if (!issue.offerReport) return undefined;
    if (sent) return undefined;
    return (
      <DuncitButton color="inherit" size="small" disabled={loading} onClick={() => void report()}>
        {loading ? t('mweb.issue.reporting') : t('mweb.issue.report')}
      </DuncitButton>
    );
  })();

  return (
    <Alert severity="error" onClose={onClose} action={action} sx={{ borderRadius: '16px' }}>
      {issue.message}
      {sent ? ` ${t('mweb.issue.reported')}` : ''}
    </Alert>
  );
}
