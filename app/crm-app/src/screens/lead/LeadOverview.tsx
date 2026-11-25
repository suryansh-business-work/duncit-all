import { Text, XStack, YStack } from 'tamagui';

import { Card } from '@/components/Card';
import { DuncitButton } from '@/components/DuncitButton';
import { notesOf, type Lead } from '@/features/leads/useLead';
import { displayDateTime } from '@/features/reminders/reminderTime';
import { useTranslation } from '@/hooks/useTranslation';
import { ContactRow } from './ContactRow';

interface Props {
  lead: Lead;
  onAddNote: () => void;
  onAddReminder: () => void;
  /** Open the call screen for this number (the CRM call line, recorded). */
  onCall: (to: string, contactName?: string) => void;
}

function Fact({ label, value }: Readonly<{ label: string; value?: string | null }>) {
  const { t } = useTranslation();
  return (
    <XStack justifyContent="space-between" gap="$3" paddingVertical="$1">
      <Text color="$muted">{label}</Text>
      <Text fontWeight="600" flexShrink={1} textAlign="right">
        {value || t('crmApp.common.dash')}
      </Text>
    </XStack>
  );
}

/** The lead at a glance: where it stands, who to call, and the notes so far. */
export function LeadOverview({ lead, onAddNote, onAddReminder, onCall }: Readonly<Props>) {
  const { t } = useTranslation();
  const contacts: readonly Lead['contacts'][number][] = lead.contacts;
  const notes = notesOf(lead);
  return (
    <YStack gap="$3">
      <Card>
        <Fact label={t('crmApp.lead.status')} value={lead.lead_status} />
        <Fact label={t('crmApp.lead.priority')} value={lead.priority} />
        <Fact label={t('crmApp.lead.city')} value={lead.city} />
        <Fact label={t('crmApp.lead.assignedTo')} value={lead.assigned_to} />
        <Fact label={t('crmApp.lead.followUp')} value={displayDateTime(lead.next_follow_up_date)} />
      </Card>
      <Card title={t('crmApp.lead.contacts')}>
        {contacts.length === 0 ? <Text color="$muted">{t('crmApp.lead.noContacts')}</Text> : null}
        {contacts.map((contact, index) => (
          <ContactRow
            key={`${contact.mobile_number ?? ''}-${index}`}
            contact={contact}
            index={index}
            onCall={onCall}
          />
        ))}
      </Card>
      <XStack gap="$3">
        <YStack flex={1}>
          <DuncitButton
            label={t('crmApp.lead.addNote')}
            onPress={onAddNote}
            variant="outline"
            fullWidth
            testID="lead-add-note"
          />
        </YStack>
        <YStack flex={1}>
          <DuncitButton
            label={t('crmApp.lead.addReminder')}
            onPress={onAddReminder}
            variant="outline"
            fullWidth
            testID="lead-add-reminder"
          />
        </YStack>
      </XStack>
      <Card title={t('crmApp.lead.notes')}>
        {notes.length === 0 ? <Text color="$muted">{t('crmApp.lead.noNotes')}</Text> : null}
        {notes.map((note) => (
          <YStack
            key={note.id ?? note.created_at ?? note.summary ?? ''}
            paddingVertical="$2"
            gap="$1"
          >
            {note.summary ? <Text fontWeight="600">{note.summary}</Text> : null}
            {note.body_text ? <Text>{note.body_text}</Text> : null}
            <Text color="$muted" fontSize="$2">
              {displayDateTime(note.created_at)}
            </Text>
          </YStack>
        ))}
      </Card>
    </YStack>
  );
}
