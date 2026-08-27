import { useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { ISSUE_REPORT_CATEGORY, buildIssueReportMessage, type ParsedIssue } from '@duncit/errors';
import { submitAppFeedback } from '@/hooks/useFeedback';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/**
 * A server-operation failure, said properly, with a way to tell somebody.
 * Tamagui twin of mWeb's IssueNotice — the Report button rides the existing
 * feedback pipeline (identity server-stamped, lands in Slack + the support
 * feedback table) and never shows for a validation refusal the person can
 * fix themselves.
 */
export function IssueNotice({ issue, page }: Readonly<{ issue: ParsedIssue; page: string }>) {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const report = async () => {
    setSending(true);
    try {
      await submitAppFeedback(
        ISSUE_REPORT_CATEGORY,
        buildIssueReportMessage(issue, { surface: 'mobileApp', page }),
        [],
        page,
      );
      setSent(true);
    } catch {
      // The report is best-effort; the original failure stays on screen.
    } finally {
      setSending(false);
    }
  };

  const reportLabel = sending ? t('mweb.issue.reporting') : t('mweb.issue.report');

  return (
    <YStack
      testID="issue-notice"
      gap={6}
      padding={12}
      borderRadius={12}
      borderWidth={1}
      borderColor="$danger"
      backgroundColor="$surface"
    >
      <Text fontSize={13.5} color="$danger">
        {issue.message}
        {sent ? ` ${t('mweb.issue.reported')}` : ''}
      </Text>
      {issue.offerReport && !sent ? (
        <XStack
          role="button"
          aria-label={reportLabel}
          alignSelf="flex-start"
          onPress={() => {
            if (!sending) report().catch(() => undefined);
          }}
          pressStyle={PRESS_STYLE.inline}
        >
          <Text fontSize={13} fontWeight="700" color="$primary">
            {reportLabel}
          </Text>
        </XStack>
      ) : null}
    </YStack>
  );
}
