import { useState } from 'react';
import { Text } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { FeedbackForm } from '@/components/support/FeedbackForm';
import { submitAppFeedback } from '@/hooks/useFeedback';
import { useTranslation } from '@/hooks/useTranslation';
import { RefreshScrollView } from '@/components/PullToRefresh';

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
      <RefreshScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24 }}>
        {sent ? (
          <SurfaceCard testID="feedback-sent" gap={6}>
            <Text fontSize={16} fontWeight="600" color="$color">
              Thanks!
            </Text>
            <Text fontSize={13} color="$muted">
              Your feedback has been sent to our team.
            </Text>
          </SurfaceCard>
        ) : (
          <FeedbackForm submitting={submitting} errorMessage={error} onSubmit={onSubmit} />
        )}
      </RefreshScrollView>
    </StackScreen>
  );
}
