import { useState } from 'react';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { Text, YStack } from 'tamagui';

import type { LeadContact } from '@/features/leads/useLead';
import { useTranslation } from '@/hooks/useTranslation';
import type { AppStackParamList } from '@/navigation/types';
import { AuthAlert } from '@/screens/auth/AuthAlert';
import { ContactCard } from './contacts/ContactCard';
import { EmailComposeModal, type ComposeTarget } from './contacts/EmailComposeModal';
import { ResultNote } from './contacts/ResultNote';
import { useEmailStatuses } from './contacts/useEmailStatuses';
import { DetailCard } from './parts/DetailCard';
import type { LeadTabProps } from './parts/tabTypes';

/**
 * The portal's Contacts tab: every contact as a card. Call opens the app's
 * call screen (the CRM call line, recorded), WhatsApp opens the chat, and
 * Email opens the composer with the contact's address.
 */
export function LeadContactsTab({ kind, id, lead }: Readonly<LeadTabProps>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const contacts: readonly LeadContact[] = lead.contacts;
  const statuses = useEmailStatuses(
    contacts.flatMap((contact) => (contact.email ? [contact.email] : [])),
  );
  const [composing, setComposing] = useState<ComposeTarget | null>(null);
  const [result, setResult] = useState<{ message: string; ok: boolean } | null>(null);

  const call = (contact: LeadContact) => {
    if (!contact.mobile_number) return;
    navigation.navigate('Call', {
      kind,
      id,
      to: contact.mobile_number,
      leadName: lead.name,
      contactName: contact.name || undefined,
    });
  };
  const email = (contact: LeadContact) => {
    if (!contact.email) return;
    setResult(null);
    setComposing({ displayName: contact.name || lead.name, email: contact.email });
  };

  return (
    <DetailCard title={t('crm.common.contacts')} icon="contacts" testID="lead-contacts-tab">
      <ResultNote result={result} />
      {statuses.error ? (
        <AuthAlert message={statuses.error} testID="lead-contacts-verify-error" />
      ) : null}
      {contacts.length === 0 ? (
        <Text color="$muted" testID="lead-contacts-empty">
          {t('crm.leadDetail.noContacts')}
        </Text>
      ) : null}
      <YStack gap="$2">
        {contacts.map((contact, index) => (
          <ContactCard
            key={`${contact.email ?? ''}-${index}`}
            contact={contact}
            index={index}
            statuses={statuses}
            onCall={call}
            onEmail={email}
          />
        ))}
      </YStack>
      <EmailComposeModal
        kind={kind}
        id={id}
        target={composing}
        onClose={() => setComposing(null)}
        onResult={(message, ok) => setResult({ message, ok })}
      />
    </DetailCard>
  );
}
