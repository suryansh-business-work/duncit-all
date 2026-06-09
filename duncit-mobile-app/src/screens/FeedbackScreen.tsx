import { useState } from 'react';
import { ScrollView, Text, TextArea, XStack } from 'tamagui';

import { PodPicker, RatingStars } from '@/components/support-live';
import { StackScreen } from '@/components/StackScreen';
import { useBouncer, type FeedbackCategory } from '@/hooks/useBouncer';
import { useSupportPods } from '@/hooks/useSupportPods';
import { toErrorMessage } from '@/utils/errors';

const CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: 'VENUE' as FeedbackCategory, label: 'Venue' },
  { value: 'HOST' as FeedbackCategory, label: 'Host' },
  { value: 'SAFETY' as FeedbackCategory, label: 'Safety' },
  { value: 'FOOD' as FeedbackCategory, label: 'Food' },
  { value: 'OTHER' as FeedbackCategory, label: 'Other' },
];

/** Live Feedback — rate the pod while it is on. RN twin of mWeb's FeedbackContent. */
export function FeedbackScreen() {
  const { options, selected, selectedId, setSelectedId } = useSupportPods();
  const { submitFeedback } = useBouncer();
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState<FeedbackCategory>('OTHER' as FeedbackCategory);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    setError(null);
    if (!selected) return setError('Pick a pod first.');
    if (!rating) return setError('Tap a star rating before submitting.');
    setBusy(true);
    try {
      await submitFeedback(selected.podDocId, rating, category, message);
      setRating(0);
      setMessage('');
      setCategory('OTHER' as FeedbackCategory);
      setSubmitted(true);
    } catch (e) {
      setError(toErrorMessage(e, 'Could not submit feedback.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <StackScreen title="Live Feedback" testID="feedback-screen">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <PodPicker options={options} selectedId={selectedId} onChange={setSelectedId} />

        <Text fontSize={13} color="$muted">
          Live feedback flows straight to the host and admin team while the pod is on.
        </Text>

        <RatingStars value={rating} onChange={setRating} />

        <XStack flexWrap="wrap" gap={8}>
          {CATEGORIES.map((c) => {
            const on = category === c.value;
            return (
              <XStack
                key={c.value}
                testID={`feedback-cat-${c.value}`}
                role="button"
                aria-label={c.label}
                aria-pressed={on}
                onPress={() => setCategory(c.value)}
                paddingHorizontal={12}
                paddingVertical={7}
                borderRadius={999}
                backgroundColor={on ? '$primary' : '$surface'}
                borderWidth={1}
                borderColor={on ? '$primary' : '$borderColor'}
                pressStyle={{ opacity: 0.85 }}
              >
                <Text fontSize={13} fontWeight="800" color={on ? '$onPrimary' : '$color'}>
                  {c.label}
                </Text>
              </XStack>
            );
          })}
        </XStack>

        <TextArea
          testID="feedback-message"
          value={message}
          onChangeText={setMessage}
          placeholder="Tell us more (optional)"
          maxLength={1000}
          backgroundColor="$surface"
          borderColor="$borderColor"
        />

        {error ? (
          <Text testID="feedback-error" fontSize={13} color="$danger">
            {error}
          </Text>
        ) : null}
        {submitted ? (
          <Text testID="feedback-success" fontSize={13} color="$primary">
            Thanks! The host has been notified.
          </Text>
        ) : null}

        <XStack
          testID="feedback-submit"
          role="button"
          aria-label="Send feedback"
          aria-disabled={busy}
          onPress={busy ? undefined : () => void submit()}
          height={50}
          alignItems="center"
          justifyContent="center"
          borderRadius={999}
          backgroundColor="$primary"
          opacity={busy ? 0.6 : 1}
          pressStyle={{ opacity: 0.85 }}
        >
          <Text fontSize={15} fontWeight="900" color="$onPrimary">
            {busy ? 'Sending…' : 'Send feedback'}
          </Text>
        </XStack>
      </ScrollView>
    </StackScreen>
  );
}
