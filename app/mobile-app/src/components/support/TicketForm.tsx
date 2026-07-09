import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, Input, Text, XStack, YStack } from 'tamagui';

import { createTicket } from '@/hooks/useSupport';
import { useThemeColors } from '@/hooks/useThemeColors';
import { CategorySelect } from './CategorySelect';
import { TicketAttachments } from './TicketAttachments';
import { DEFAULT_TICKET_CATEGORY, toServerCategory } from './ticketCategories';

interface Props {
  onCreated: (id: string) => void;
  initialName?: string;
  initialEmail?: string;
  podId?: string;
  podTitle?: string;
}

/**
 * Create-ticket form — name · email · category · subject · message. Mirrors
 * mWeb's SupportForm: the same fields (name/email auto-filled), the same
 * dropdown categories and the same "Send to support" action.
 */
/** A labelled field: a caption above its input (Item 1 — proper labels). */
function FieldLabel({ children }: Readonly<{ children: string }>) {
  return (
    <Text fontSize={12.5} fontWeight="800" color="$muted">
      {children}
    </Text>
  );
}

export function TicketForm({
  onCreated,
  initialName = '',
  initialEmail = '',
  podId,
  podTitle,
}: Readonly<Props>) {
  const { primary } = useThemeColors();
  const [category, setCategory] = useState<string>(DEFAULT_TICKET_CATEGORY);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
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
      const id = await createTicket(
        subject.trim(),
        message.trim(),
        toServerCategory(category),
        attachments,
        podId && podTitle ? { id: podId, title: podTitle } : undefined,
      );
      onCreated(id);
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
      {podTitle ? (
        <XStack
          testID="ticket-attached-pod"
          alignItems="center"
          gap={6}
          alignSelf="flex-start"
          paddingHorizontal={10}
          paddingVertical={5}
          borderRadius={999}
          borderWidth={1}
          borderColor="$primary"
        >
          <MaterialIcons name="event" size={14} color={primary} />
          <Text fontSize={12} fontWeight="800" color="$primary">
            About pod: {podTitle}
          </Text>
        </XStack>
      ) : null}
      <YStack gap={4}>
        <FieldLabel>Name</FieldLabel>
        <Input
          testID="ticket-name"
          value={initialName}
          disabled
          autoComplete="name"
          backgroundColor="$background"
          opacity={0.7}
        />
      </YStack>
      <YStack gap={4}>
        <FieldLabel>Email</FieldLabel>
        <Input
          testID="ticket-email"
          value={initialEmail}
          disabled
          autoCapitalize="none"
          keyboardType="email-address"
          backgroundColor="$background"
          opacity={0.7}
        />
        <Text fontSize={11} color="$muted">
          Name and email come from your Duncit account.
        </Text>
      </YStack>
      <YStack gap={4}>
        <FieldLabel>Category</FieldLabel>
        <CategorySelect value={category} onChange={setCategory} />
      </YStack>
      <YStack gap={4}>
        <FieldLabel>Subject</FieldLabel>
        <Input
          testID="ticket-subject"
          placeholder="A short summary"
          value={subject}
          onChangeText={setSubject}
          backgroundColor="$background"
        />
      </YStack>
      <YStack gap={4}>
        <FieldLabel>Message</FieldLabel>
        <Input
          testID="ticket-message"
          placeholder="Tell us what's going on"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
          backgroundColor="$background"
        />
      </YStack>
      <TicketAttachments attachments={attachments} onChange={setAttachments} />
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
        {submitting ? 'Sending…' : 'Send to support'}
      </Button>
    </YStack>
  );
}
