import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { createTicket } from '@/hooks/useSupport';
import { useThemeColors } from '@/hooks/useThemeColors';
import { CategorySelect } from './CategorySelect';
import { TicketAttachments } from './TicketAttachments';
import { DEFAULT_TICKET_CATEGORY, toServerCategory } from './ticketCategories';
import { useTranslation } from '@/hooks/useTranslation';

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
    <Text fontSize={12.5} fontWeight="600" color="$muted">
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
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  const [category, setCategory] = useState<string>(DEFAULT_TICKET_CATEGORY);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!subject.trim() || !message.trim()) {
      setError(t('mweb.support.subjectAndMessageAreRequired'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const { id } = await createTicket(
        subject.trim(),
        message.trim(),
        toServerCategory(category),
        attachments,
        podId && podTitle ? { id: podId, title: podTitle } : undefined,
      );
      onCreated(id);
    } catch (err) {
      // Surface the real server message (was swallowed) so failures are diagnosable.
      setError(err instanceof Error ? err.message : t('mweb.common.couldNotCreateTheTicketPlease'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SurfaceCard testID="ticket-form" gap={12}>
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
          <Text fontSize={12} fontWeight="600" color="$primary">
            About pod: {podTitle}
          </Text>
        </XStack>
      ) : null}
      <YStack gap={4}>
        <FieldLabel>Name</FieldLabel>
        <Input
          testID="ticket-name"
          aria-label={t('mweb.support.name')}
          value={initialName}
          disabled
          autoComplete="name"
          backgroundColor="$surface"
          borderRadius={14}
          borderColor="$borderColor"
          opacity={0.7}
        />
      </YStack>
      <YStack gap={4}>
        <FieldLabel>{t('mweb.common.email')}</FieldLabel>
        <Input
          testID="ticket-email"
          aria-label={t('mweb.common.email')}
          value={initialEmail}
          disabled
          autoCapitalize="none"
          keyboardType="email-address"
          backgroundColor="$surface"
          borderRadius={14}
          borderColor="$borderColor"
          opacity={0.7}
        />
        <Text fontSize={11} color="$muted">
          Name and email come from your Duncit account.
        </Text>
      </YStack>
      <YStack gap={4}>
        <FieldLabel>{t('mweb.common.category')}</FieldLabel>
        <CategorySelect value={category} onChange={setCategory} />
      </YStack>
      <YStack gap={4}>
        <FieldLabel>{t('mweb.common.subject')}</FieldLabel>
        <Input
          testID="ticket-subject"
          aria-label={t('mweb.common.subject')}
          placeholder={t('mweb.support.aShortSummary')}
          placeholderTextColor="$muted"
          value={subject}
          onChangeText={setSubject}
          maxLength={120}
          backgroundColor="$surface"
          borderRadius={14}
          borderColor="$borderColor"
        />
      </YStack>
      <YStack gap={4}>
        <FieldLabel>{t('mweb.common.message')}</FieldLabel>
        <Input
          testID="ticket-message"
          aria-label={t('mweb.common.message')}
          placeholder="Tell us what's going on"
          placeholderTextColor="$muted"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
          backgroundColor="$surface"
          borderRadius={14}
          borderColor="$borderColor"
        />
      </YStack>
      <TicketAttachments attachments={attachments} onChange={setAttachments} />
      {error ? (
        <Text testID="ticket-error" color="$danger" fontSize={12}>
          {error}
        </Text>
      ) : null}
      <DuncitButton
        testID="ticket-submit"
        label={submitting ? 'Sending…' : 'Send to support'}
        onPress={submit}
        disabled={submitting}
        size="lg"
        fullWidth
      />
    </SurfaceCard>
  );
}
