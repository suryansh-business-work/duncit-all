import { useState } from 'react';
import { Button, Input, Text, YStack } from 'tamagui';

import { createTicket } from '@/hooks/useSupport';
import { CategorySelect } from './CategorySelect';
import { TicketAttachments } from './TicketAttachments';
import { DEFAULT_TICKET_CATEGORY, toServerCategory } from './ticketCategories';

interface Props {
  onCreated: (id: string) => void;
  initialName?: string;
  initialEmail?: string;
}

/**
 * Create-ticket form — name · email · category · subject · message. Mirrors
 * mWeb's SupportForm: the same fields (name/email auto-filled), the same
 * dropdown categories and the same "Send to support" action.
 */
export function TicketForm({ onCreated, initialName = '', initialEmail = '' }: Readonly<Props>) {
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
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
      <Input
        testID="ticket-name"
        placeholder="Your name"
        value={name}
        onChangeText={setName}
        autoComplete="name"
        backgroundColor="$background"
      />
      <Input
        testID="ticket-email"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        backgroundColor="$background"
      />
      <CategorySelect value={category} onChange={setCategory} />
      <Input
        testID="ticket-subject"
        placeholder="Subject"
        value={subject}
        onChangeText={setSubject}
        backgroundColor="$background"
      />
      <Input
        testID="ticket-message"
        placeholder="Tell us what's going on"
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={4}
        backgroundColor="$background"
      />
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
