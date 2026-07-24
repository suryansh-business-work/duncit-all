import { useState } from 'react';
import { Button, Input, Text, XStack, YStack } from 'tamagui';
import { FEEDBACK_CATEGORIES } from '@duncit/slack';

interface FeedbackValues {
  category: string;
  message: string;
}

interface Props {
  submitting?: boolean;
  errorMessage?: string;
  onSubmit: (values: FeedbackValues) => void;
}

/** A labelled field caption (mirrors TicketForm's FieldLabel). */
function FieldLabel({ children }: Readonly<{ children: string }>) {
  return (
    <Text fontSize={12.5} fontWeight="800" color="$muted">
      {children}
    </Text>
  );
}

/**
 * Report-a-problem / feedback form — category chips + message + submit. RN twin
 * of mWeb's FeedbackForm: the same shared FEEDBACK_CATEGORIES and the same
 * "at least 10 characters" rule before it posts to Slack.
 */
export function FeedbackForm({ submitting, errorMessage, onSubmit }: Readonly<Props>) {
  const [category, setCategory] = useState<string>(FEEDBACK_CATEGORIES[0]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (message.trim().length < 10) {
      setError('Please describe it in at least 10 characters.');
      return;
    }
    setError('');
    onSubmit({ category, message: message.trim() });
  };

  return (
    <YStack
      testID="feedback-form"
      gap={12}
      padding={14}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <YStack gap={6}>
        <FieldLabel>Category</FieldLabel>
        <XStack gap={8} flexWrap="wrap">
          {FEEDBACK_CATEGORIES.map((option) => {
            const selected = option === category;
            return (
              <XStack
                key={option}
                testID={`feedback-cat-${option}`}
                role="button"
                aria-label={option}
                onPress={() => setCategory(option)}
                paddingHorizontal={14}
                paddingVertical={8}
                borderRadius={999}
                borderWidth={1}
                borderColor={selected ? '$primary' : '$borderColor'}
                backgroundColor={selected ? '$primary' : '$surface'}
                pressStyle={{ opacity: 0.85 }}
              >
                <Text fontWeight="800" fontSize={13} color={selected ? '$onPrimary' : '$color'}>
                  {option}
                </Text>
              </XStack>
            );
          })}
        </XStack>
      </YStack>

      <YStack gap={4}>
        <FieldLabel>What&apos;s going on?</FieldLabel>
        <Input
          testID="feedback-message"
          aria-label="Message"
          placeholder="Describe the problem or share your idea"
          placeholderTextColor="$muted"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
          backgroundColor="$background"
        />
        <Text fontSize={11} color="$muted">
          At least 10 characters.
        </Text>
      </YStack>

      {error || errorMessage ? (
        <Text testID="feedback-error" color="$danger" fontSize={12}>
          {error || errorMessage}
        </Text>
      ) : null}

      <Button
        testID="feedback-submit"
        onPress={submit}
        disabled={submitting}
        backgroundColor="$primary"
        color="$onPrimary"
        fontWeight="900"
      >
        {submitting ? 'Sending…' : 'Send feedback'}
      </Button>
    </YStack>
  );
}
