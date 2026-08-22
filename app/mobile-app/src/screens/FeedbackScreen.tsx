import { useState } from 'react';
import { ScrollView, Text, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { FeedbackForm } from '@/components/support/FeedbackForm';
import { submitAppFeedback } from '@/hooks/useFeedback';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Report a Problem — a quick feedback note that reaches the team on Slack. RN
 * twin of mWeb's /support/feedback page; the server stamps the signed-in
 * identity, so the client only sends content.
 */
export function FeedbackScreen() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (values: { category: string; message: string; media_urls: string[] }) => {
    setSubmitting(true);
    setError('');
    try {
      await submitAppFeedback(values.category, values.message, values.media_urls);
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('mweb.feedback.couldNotSendFeedbackPleaseTry'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StackScreen title={t('mweb.common.reportAProblem')} testID="feedback-screen">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 24 }}>
        <Text fontSize={13} color="$muted">
          Send feedback or report an issue — it reaches our team instantly
        </Text>
        {sent ? (
          <YStack
            testID="feedback-sent"
            gap={6}
            padding={14}
            borderRadius={16}
            borderWidth={1}
            borderColor="$borderColor"
            backgroundColor="$surface"
          >
            <Text fontSize={15} fontWeight="700" color="$color">
              Thanks!
            </Text>
            <Text fontSize={13} color="$muted">
              Your feedback has been sent to our team.
            </Text>
          </YStack>
        ) : (
          <FeedbackForm submitting={submitting} errorMessage={error} onSubmit={onSubmit} />
        )}
      </ScrollView>
    </StackScreen>
  );
}
