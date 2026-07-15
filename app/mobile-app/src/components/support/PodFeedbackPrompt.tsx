import { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, TextArea, XStack, YStack } from 'tamagui';

import { Field } from '@/components/Field';
import { useBouncer, type PendingPodFeedback } from '@/hooks/useBouncer';

const CATEGORIES = ['VENUE', 'HOST', 'SAFETY', 'FOOD', 'OTHER'] as const;
type Category = (typeof CATEGORIES)[number];

/**
 * After a user attends a pod and reopens the app, ask how it went (Bug 6) —
 * replaces the old in-support "Live Feedback" with a one-time prompt.
 */
export function PodFeedbackPrompt() {
  const { getPendingPodFeedback, submitPodFeedback } = useBouncer();
  const [pod, setPod] = useState<PendingPodFeedback>(null);
  const [dismissed, setDismissed] = useState(false);
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState<Category>('OTHER');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let on = true;
    getPendingPodFeedback()
      .then((p) => on && setPod(p))
      .catch(() => undefined);
    return () => {
      on = false;
    };
  }, [getPendingPodFeedback]);

  if (!pod || dismissed) return null;

  // Only reachable via the Submit button, which is disabled until a rating is set.
  const submit = async () => {
    setBusy(true);
    try {
      await submitPodFeedback(pod.id, rating, category, message);
      setDismissed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <YStack
      testID="pod-feedback-prompt"
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={200}
      backgroundColor="rgba(0,0,0,0.55)"
      alignItems="center"
      justifyContent="center"
      padding={24}
    >
      <YStack
        width="100%"
        maxWidth={360}
        gap={12}
        padding={20}
        borderRadius={16}
        backgroundColor="$background"
      >
        <Text fontSize={16} fontWeight="900" color="$color">
          How was “{pod.title}”?
        </Text>
        <XStack gap={6} justifyContent="center">
          {[1, 2, 3, 4, 5].map((n) => (
            <XStack
              key={n}
              testID={`pod-feedback-star-${n}`}
              role="button"
              aria-label={`Rate ${n}`}
              onPress={() => setRating(n)}
              pressStyle={{ opacity: 0.7 }}
            >
              <MaterialIcons
                name={n <= rating ? 'star' : 'star-border'}
                size={30}
                color="#f5a623"
              />
            </XStack>
          ))}
        </XStack>
        <XStack gap={6} flexWrap="wrap" justifyContent="center">
          {CATEGORIES.map((c) => {
            const active = c === category;
            return (
              <XStack
                key={c}
                testID={`pod-feedback-cat-${c}`}
                role="button"
                aria-label={c}
                onPress={() => setCategory(c)}
                paddingHorizontal={10}
                paddingVertical={5}
                borderRadius={999}
                borderWidth={1}
                borderColor={active ? '$primary' : '$borderColor'}
                backgroundColor={active ? '$primary' : 'transparent'}
              >
                <Text fontSize={11} fontWeight="800" color={active ? '$onPrimary' : '$muted'}>
                  {c.charAt(0) + c.slice(1).toLowerCase()}
                </Text>
              </XStack>
            );
          })}
        </XStack>
        <Field label="Comments">
          <TextArea
            testID="pod-feedback-comment"
            aria-label="Comments"
            value={message}
            onChangeText={setMessage}
            placeholder="Tell us more (optional)"
            placeholderTextColor="$muted"
            maxLength={1000}
            backgroundColor="$surface"
            borderColor="$borderColor"
          />
        </Field>
        <XStack gap={8} justifyContent="flex-end">
          <XStack
            testID="pod-feedback-skip"
            role="button"
            aria-label="Not now"
            onPress={() => setDismissed(true)}
            height={42}
            paddingHorizontal={18}
            alignItems="center"
            justifyContent="center"
            borderRadius={999}
            borderWidth={1}
            borderColor="$borderColor"
          >
            <Text fontSize={14} fontWeight="800" color="$color">
              Not now
            </Text>
          </XStack>
          <XStack
            testID="pod-feedback-submit"
            role="button"
            aria-label="Submit feedback"
            aria-disabled={!rating || busy}
            onPress={!rating || busy ? undefined : () => void submit()}
            height={42}
            paddingHorizontal={18}
            alignItems="center"
            justifyContent="center"
            borderRadius={999}
            backgroundColor="$primary"
            opacity={!rating || busy ? 0.5 : 1}
          >
            <Text fontSize={14} fontWeight="800" color="$onPrimary">
              {busy ? 'Sending…' : 'Submit'}
            </Text>
          </XStack>
        </XStack>
      </YStack>
    </YStack>
  );
}
