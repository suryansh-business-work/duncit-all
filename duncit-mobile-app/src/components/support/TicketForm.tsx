import { useState } from 'react';
import { Button, Input, Text, XStack, YStack } from 'tamagui';

import { createTicket } from '@/hooks/useSupport';

const CATEGORIES = ['GENERAL', 'PAYMENT', 'BOOKING', 'SAFETY', 'TECHNICAL', 'OTHER'];

/** Create-ticket form (subject · category · message). On success calls onCreated. */
export function TicketForm({ onCreated }: Readonly<{ onCreated: () => void }>) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!subject.trim() || !message.trim()) {
      setError('Subject and message are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await createTicket(subject.trim(), message.trim(), category);
      onCreated();
    } catch {
      setError('Could not create the ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <YStack
      testID="ticket-form"
      gap={10}
      padding={14}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <Input
        testID="ticket-subject"
        placeholder="Subject"
        value={subject}
        onChangeText={setSubject}
        backgroundColor="$background"
      />
      <XStack gap={6} flexWrap="wrap">
        {CATEGORIES.map((c) => {
          const selected = category === c;
          return (
            <XStack
              key={c}
              testID={`ticket-cat-${c}`}
              role="button"
              aria-label={c}
              aria-pressed={selected}
              onPress={() => setCategory(c)}
              paddingHorizontal={10}
              paddingVertical={5}
              borderRadius={999}
              borderWidth={1}
              borderColor={selected ? '$primary' : '$borderColor'}
              backgroundColor={selected ? '$primary' : 'transparent'}
            >
              <Text fontSize={11} fontWeight="800" color={selected ? '$onPrimary' : '$color'}>
                {c}
              </Text>
            </XStack>
          );
        })}
      </XStack>
      <Input
        testID="ticket-message"
        placeholder="Describe your issue"
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={4}
        backgroundColor="$background"
      />
      {error ? (
        <Text testID="ticket-error" color="$danger" fontSize={12}>
          {error}
        </Text>
      ) : null}
      <Button
        testID="ticket-submit"
        onPress={submit}
        disabled={submitting}
        backgroundColor="$primary"
        color="$onPrimary"
        fontWeight="900"
      >
        {submitting ? 'Submitting…' : 'Submit ticket'}
      </Button>
    </YStack>
  );
}
