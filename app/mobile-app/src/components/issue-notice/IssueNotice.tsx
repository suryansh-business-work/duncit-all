import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { ISSUE_REPORT_CATEGORY, buildIssueReportMessage, type ParsedIssue } from '@duncit/errors';
import { submitAppFeedback } from '@/hooks/useFeedback';
import { useThemeColors } from '@/hooks/useThemeColors';
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
  const { danger } = useThemeColors();
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

  // The same shape as mWeb's error Alert: the icon, the message in ink on the
  // danger tint, and Report at the right.
  return (
    <XStack
      testID="issue-notice"
      alignItems="center"
      gap={10}
      paddingHorizontal={14}
      paddingVertical={10}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$dangerSoft"
    >
      <MaterialIcons name="error-outline" size={20} color={danger} />
      <Text flex={1} fontSize={14} lineHeight={20} color="$color">
        {issue.message}
        {sent ? ` ${t('mweb.issue.reported')}` : ''}
      </Text>
      {issue.offerReport && !sent ? (
        <XStack
          role="button"
          aria-label={reportLabel}
          minHeight={36}
          alignItems="center"
          paddingHorizontal={8}
          onPress={() => {
            if (!sending) report().catch(() => undefined);
          }}
          pressStyle={PRESS_STYLE.inline}
        >
          <Text fontSize={13} fontWeight="600" color="$primary">
            {reportLabel}
          </Text>
        </XStack>
      ) : null}
    </XStack>
  );
}
